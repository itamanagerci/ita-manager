"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerInspectionEnginSchema, type CreerInspectionEnginInput } from "@/types/validations/vehicules";

async function requireAccesInspectionEngin() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "inspection-engin");
  return utilisateur;
}

export async function listerPointsInspectionEngin() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.pointInspection.findMany({ where: { categorie: "ENGIN", actif: true }, orderBy: { ordre: "asc" } });
}

export async function listerDocumentsInspectionEngin() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.documentInspection.findMany({
    where: { categorie: "ENGIN", actif: true },
    orderBy: { ordre: "asc" },
  });
}

/**
 * Anomalie → bascule automatiquement Vehicule.etat à HORS_SERVICE (mise en
 * service réellement bloquée — "action corrective non faite" du document
 * de cadrage, contrairement au véhicule léger/PL où c'est une alerte
 * seule) + Notification au Responsable Service Logistique. Cf. CLAUDE.md.
 */
export async function creerInspectionEngin(
  input: CreerInspectionEnginInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesInspectionEngin();

  const analyse = creerInspectionEnginSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const anomalieDetectee =
    donnees.points.some((p) => p.etat !== "BON") || donnees.documents.some((d) => d.etat !== "BON");

  const inspection = await prisma.$transaction(async (tx) => {
    const nouvelleInspection = await tx.inspectionEngin.create({
      data: {
        vehiculeId: donnees.vehiculeId,
        demandeTransportId: donnees.demandeTransportId || null,
        date: new Date(donnees.date),
        heure: donnees.heure || null,
        chantierSite: donnees.chantierSite,
        provenance: donnees.provenance,
        conducteurNom: donnees.conducteurNom || null,
        transporteurNom: donnees.transporteurNom || null,
        receptionnaireVerificateurId: utilisateur.id,
        chefChantierOuGarageId: donnees.chefChantierOuGarageId || null,
        transporteurEnginNom: donnees.transporteurEnginNom || null,
        statut: "SIGNEE",
        anomalieDetectee,
        dateSignature: new Date(),
        reponsesPoints: {
          create: donnees.points.map((p) => ({ pointId: p.pointId, etat: p.etat, observation: p.observation })),
        },
        reponsesDocuments: {
          create: donnees.documents.map((d) => ({
            documentId: d.documentId,
            etat: d.etat,
            observation: d.observation,
          })),
        },
      },
    });

    if (anomalieDetectee) {
      const vehiculeAvant = await tx.vehicule.findUniqueOrThrow({ where: { id: donnees.vehiculeId } });
      await tx.vehicule.update({ where: { id: donnees.vehiculeId }, data: { etat: "HORS_SERVICE" } });
      await tx.historiqueMouvementVehicule.create({
        data: {
          vehiculeId: donnees.vehiculeId,
          type: "CHANGEMENT_ETAT",
          etatAvant: vehiculeAvant.etat,
          etatApres: "HORS_SERVICE",
          commentaire: `Anomalie à l'inspection engin IE-${String(nouvelleInspection.numero).padStart(5, "0")} — mise en service bloquée`,
          effectueParId: utilisateur.id,
        },
      });
    }

    return nouvelleInspection;
  });

  if (anomalieDetectee) {
    const responsable = await prisma.accesUtilisateur.findFirst({
      where: {
        actif: true,
        utilisateur: { statut: "ACTIF" },
        sousModule: { code: "magasins", actif: true, module: { code: "logistique" } },
      },
      include: { utilisateur: true },
      orderBy: { utilisateur: { dateCreation: "asc" } },
    });
    if (responsable) {
      await prisma.notification.create({
        data: {
          destinataireId: responsable.utilisateur.id,
          titre: `Anomalie détectée — Inspection engin IE-${String(inspection.numero).padStart(5, "0")} — mise en service bloquée`,
          description: `Engin inspecté sur ${donnees.chantierSite}, basculé HORS_SERVICE automatiquement.`,
          entiteType: "InspectionEngin",
          entiteId: inspection.id,
          lienDetail: "/dashboard/logistique/inspection-engin",
        },
      });
    }
  }

  return { succes: true };
}

export async function listerInspectionsEngin() {
  await requireAccesInspectionEngin();

  return prisma.inspectionEngin.findMany({
    include: {
      vehicule: true,
      receptionnaireVerificateur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirInspectionEngin(inspectionId: string) {
  await requireAccesInspectionEngin();

  return prisma.inspectionEngin.findUnique({
    where: { id: inspectionId },
    include: {
      vehicule: true,
      receptionnaireVerificateur: { select: { nom: true, prenom: true } },
      chefChantierOuGarage: { select: { nom: true, prenom: true } },
      reponsesPoints: { include: { point: true }, orderBy: { point: { ordre: "asc" } } },
      reponsesDocuments: { include: { document: true }, orderBy: { document: { ordre: "asc" } } },
    },
  });
}
