"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { NonConformite } from "@prisma/client";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import {
  creerNonConformiteManuelleSchema,
  mettreAJourPlanActionNonConformiteSchema,
  cloturerNonConformiteSchema,
  type CreerNonConformiteManuelleInput,
  type MettreAJourPlanActionNonConformiteInput,
  type CloturerNonConformiteInput,
} from "@/types/validations/qhse";

async function requireAccesNonConformite() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "non-conformite");
  return utilisateur;
}

export async function peutCloturerNonConformite(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "qhse", "non-conformite");
}

type OrigineNonConformite =
  | { type: "POINT_INSPECTION_HSE"; reponsePointId: string; libellePoint: string }
  | { type: "RAPPORT_INCIDENT"; rapportIncidentId: string; description: string };

/**
 * Flux 7 — point d'arrivée partagé de deux origines, idempotent
 * (@@unique sur reponsePointInspectionHSEId ET sur rapportIncidentId,
 * indépendamment l'une de l'autre — NULL n'entre jamais en conflit avec
 * NULL dans une contrainte unique Postgres). Réutilisée par
 * creerInspectionHSE() (qhse-inspection.ts, une fois par point répondu
 * NON) ET creerRapportIncident() (qhse-rapport-incident.ts, quand
 * nonConformiteIdentifiee est coché) — même principe que
 * creerOuReutiliserDemandeReapprovisionnement() (seuil-alerte.ts, Lot 6).
 */
export async function creerOuReutiliserNonConformite(
  origine: OrigineNonConformite,
  acteurId: string,
): Promise<NonConformite> {
  const where =
    origine.type === "POINT_INSPECTION_HSE"
      ? { reponsePointInspectionHSEId: origine.reponsePointId }
      : { rapportIncidentId: origine.rapportIncidentId };

  const existante = await prisma.nonConformite.findFirst({ where });
  if (existante) return existante;

  const nonConformite = await prisma.nonConformite.create({
    data: {
      identificateurId: acteurId,
      typeNonConformite:
        origine.type === "POINT_INSPECTION_HSE" ? "INSPECTION_VISUELLE" : "NON_RESPECT_EXIGENCE",
      descriptionNonConformite:
        origine.type === "POINT_INSPECTION_HSE"
          ? `Point d'inspection HSE non conforme : ${origine.libellePoint}`
          : origine.description,
      reponsePointInspectionHSEId: origine.type === "POINT_INSPECTION_HSE" ? origine.reponsePointId : null,
      rapportIncidentId: origine.type === "RAPPORT_INCIDENT" ? origine.rapportIncidentId : null,
    },
  });

  await enregistrerTransition({
    entiteType: "NonConformite",
    entiteId: nonConformite.id,
    statutNouveau: "OUVERTE",
    acteurId,
  });

  return nonConformite;
}

export async function creerNonConformiteManuelle(
  input: CreerNonConformiteManuelleInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesNonConformite();

  const analyse = creerNonConformiteManuelleSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const nonConformite = await prisma.nonConformite.create({
    data: {
      identificateurId: utilisateur.id,
      typeNonConformite: donnees.typeNonConformite,
      processus: donnees.processus || null,
      normeDocReference: donnees.normeDocReference || null,
      refExigence: donnees.refExigence || null,
      descriptionNonConformite: donnees.descriptionNonConformite,
      preuveDescription: donnees.preuveDescription || null,
    },
  });

  await enregistrerTransition({
    entiteType: "NonConformite",
    entiteId: nonConformite.id,
    statutNouveau: "OUVERTE",
    acteurId: utilisateur.id,
  });

  return { succes: true };
}

export async function listerNonConformites(filtreStatut?: "OUVERTE" | "CLOTUREE") {
  await requireAccesNonConformite();

  return prisma.nonConformite.findMany({
    where: filtreStatut ? { statut: filtreStatut } : undefined,
    include: {
      identificateur: { select: { nom: true, prenom: true } },
      responsableQHSE: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirNonConformite(id: string) {
  await requireAccesNonConformite();

  return prisma.nonConformite.findUnique({
    where: { id },
    include: {
      identificateur: { select: { nom: true, prenom: true } },
      responsableMiseOeuvre: { select: { nom: true, prenom: true } },
      responsableQHSE: { select: { nom: true, prenom: true } },
      photos: true,
      reponsePointInspectionHSE: { include: { point: true, inspection: true } },
      rapportIncident: { select: { numero: true } },
    },
  });
}

export async function mettreAJourPlanActionNonConformite(
  input: MettreAJourPlanActionNonConformiteInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesNonConformite();

  const analyse = mettreAJourPlanActionNonConformiteSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.nonConformite.update({
    where: { id: donnees.nonConformiteId },
    data: {
      correctionContenu: donnees.correctionContenu || null,
      correctionDelai: donnees.correctionDelai ? new Date(donnees.correctionDelai) : null,
      analyseCausesContenu: donnees.analyseCausesContenu || null,
      analyseCausesDelai: donnees.analyseCausesDelai ? new Date(donnees.analyseCausesDelai) : null,
      actionsCorrectivesContenu: donnees.actionsCorrectivesContenu || null,
      actionsCorrectivesDelai: donnees.actionsCorrectivesDelai
        ? new Date(donnees.actionsCorrectivesDelai)
        : null,
      dateAchevement: donnees.dateAchevement ? new Date(donnees.dateAchevement) : null,
      responsableMiseOeuvreId: donnees.responsableMiseOeuvreId || null,
      dateSignatureMiseOeuvre: donnees.dateAchevement ? new Date() : undefined,
    },
  });

  return { succes: true };
}

/**
 * Clôture gatée par un accès réel qhse/non-conformite
 * (possedeAccesSousModule), jamais Fonction/niveauHierarchique.
 */
export async function cloturerNonConformite(
  input: CloturerNonConformiteInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutCloturerNonConformite(utilisateur.id))) redirect("/dashboard");

  const analyse = cloturerNonConformiteSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const nonConformite = await prisma.nonConformite.findUnique({ where: { id: donnees.nonConformiteId } });
  if (!nonConformite) return { erreur: "Non-conformité introuvable." };
  if (nonConformite.statut !== "OUVERTE") return { erreur: "Cette non-conformité est déjà clôturée." };

  await prisma.nonConformite.update({
    where: { id: donnees.nonConformiteId },
    data: {
      statut: "CLOTUREE",
      decisionCloture: donnees.decisionCloture,
      responsableQHSEId: utilisateur.id,
      dateCloture: new Date(),
    },
  });

  await enregistrerTransition({
    entiteType: "NonConformite",
    entiteId: nonConformite.id,
    statutPrecedent: "OUVERTE",
    statutNouveau: "CLOTUREE",
    acteurId: utilisateur.id,
    commentaire: donnees.decisionCloture,
  });

  return { succes: true };
}

export async function ajouterPhotoNonConformite(
  nonConformiteId: string,
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesNonConformite();

  const fichiers = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return { erreur: "Aucun fichier fourni." };

  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX_OCTETS) return { erreur: "Une photo dépasse la taille maximale (20 Mo)." };
    if (!MIME_TYPES_AUTORISES.includes(fichier.type)) {
      return { erreur: `Type de fichier non autorisé : ${fichier.name}.` };
    }
  }

  const supabaseAdmin = createAdminClient();
  for (const fichier of fichiers) {
    const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
    const cheminFichier = `qhse/non-conformite/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(cheminFichier, fichier, { contentType: fichier.type });
    if (uploadError) continue;

    await prisma.photoNonConformite.create({
      data: { nonConformiteId, cheminFichier, nomFichierOriginal: fichier.name, ajouteParId: utilisateur.id },
    });
  }

  return { succes: true };
}
