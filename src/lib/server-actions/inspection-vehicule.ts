"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerInspectionVehiculeSchema, type CreerInspectionVehiculeInput } from "@/types/validations/vehicules";

async function requireAccesInspectionVehicule() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "inspection-vehicule");
  return utilisateur;
}

export async function listerPointsInspectionVehicule() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.pointInspection.findMany({ where: { categorie: "VEHICULE", actif: true }, orderBy: { ordre: "asc" } });
}

export async function listerDocumentsInspectionVehicule() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.documentInspection.findMany({
    where: { categorie: "VEHICULE", actif: true },
    orderBy: { ordre: "asc" },
  });
}

/**
 * Anomalie (point/document Mauvais ou Absent) → alerte au Responsable
 * Service Logistique, jamais un blocage automatique (contrairement à
 * l'engin) — "déclenchement possible d'une Fiche Non-Conformité QHSE" :
 * QHSE n'est pas construit, seule la Notification est réelle, même
 * principe "refuser/rester en attente explicite" que Achat. Cf. CLAUDE.md.
 */
export async function creerInspectionVehicule(
  input: CreerInspectionVehiculeInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesInspectionVehicule();

  const analyse = creerInspectionVehiculeSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const anomalieDetectee =
    donnees.points.some((p) => p.etat !== "BON") || donnees.documents.some((d) => d.etat !== "BON");

  const inspection = await prisma.inspectionVehicule.create({
    data: {
      vehiculeId: donnees.vehiculeId,
      demandeTransportId: donnees.demandeTransportId || null,
      date: new Date(donnees.date),
      heure: donnees.heure || null,
      chantierSiteLieu: donnees.chantierSiteLieu,
      kilometrage: donnees.kilometrage,
      destination: donnees.destination,
      conducteurNom: donnees.conducteurNom,
      transporteurNom: donnees.transporteurNom || null,
      niveauCarburant: donnees.niveauCarburant,
      receptionnaireVerificateurId: utilisateur.id,
      chefChantierId: donnees.chefChantierId || null,
      remorqueurNom: donnees.remorqueurNom || null,
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
          titre: `Anomalie détectée — Inspection véhicule VI-${String(inspection.numero).padStart(5, "0")}`,
          description: `Véhicule inspecté sur ${donnees.chantierSiteLieu}, un ou plusieurs points/documents non conformes.`,
          entiteType: "InspectionVehicule",
          entiteId: inspection.id,
          lienDetail: "/dashboard/logistique/inspection-vehicule",
        },
      });
    }
  }

  return { succes: true };
}

export async function listerInspectionsVehicule() {
  await requireAccesInspectionVehicule();

  return prisma.inspectionVehicule.findMany({
    include: {
      vehicule: true,
      receptionnaireVerificateur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirInspectionVehicule(inspectionId: string) {
  await requireAccesInspectionVehicule();

  return prisma.inspectionVehicule.findUnique({
    where: { id: inspectionId },
    include: {
      vehicule: true,
      receptionnaireVerificateur: { select: { nom: true, prenom: true } },
      chefChantier: { select: { nom: true, prenom: true } },
      reponsesPoints: { include: { point: true }, orderBy: { point: { ordre: "asc" } } },
      reponsesDocuments: { include: { document: true }, orderBy: { document: { ordre: "asc" } } },
    },
  });
}
