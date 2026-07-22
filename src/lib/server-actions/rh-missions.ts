"use server";

import { redirect } from "next/navigation";
import type { StatutMission } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { peutValiderRH, resoudreResponsableRH } from "@/lib/server-actions/rh-partage";
import {
  creerDemandeMissionSchema,
  refuserSchema,
  type CreerDemandeMissionInput,
} from "@/types/validations/rh";

const TYPE_MODULE = "rh";
const SOUS_MODULE = "mission";
const LIEN_DETAIL = "/dashboard/rh/mission";

async function requireAccesMission() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "rh", "mission");
  return utilisateur;
}

export async function creerDemandeMission(
  input: CreerDemandeMissionInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesMission();

  const analyse = creerDemandeMissionSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const responsable = await resoudreResponsableRH();
  if (!responsable) {
    return {
      erreur: "Aucun responsable RH actif n'est configuré — impossible de créer la demande.",
    };
  }

  const demande = await prisma.demandeMission.create({
    data: {
      employeConcerneId: donnees.employeConcerneId,
      initiateurId: utilisateur.id,
      typeMission: donnees.typeMission,
      description: donnees.description,
      lieu: donnees.lieu,
      dateDebut: new Date(donnees.dateDebut),
      dateFin: new Date(donnees.dateFin),
      fraisDeclares: donnees.fraisDeclares ?? null,
      motifFrais: donnees.motifFrais || null,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeMission",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_RH",
    acteurId: utilisateur.id,
  });

  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMission",
    entiteId: demande.id,
    demandeurId: donnees.employeConcerneId,
    statutLibelle: "En attente des Ressources Humaines",
    montant: donnees.fraisDeclares ?? null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsable.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

/**
 * Se termine à VALIDEE_RH pour ce lot (les deux champs DemandeIndex passent
 * à null, donc "traitée") — le futur Lot 8 (DFC) reprendra les missions à ce
 * statut pour l'étape de paiement. Ne pas bloquer la demande en attendant un
 * rôle DFC qui n'existe pas encore.
 */
export async function validerMission(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const demande = await prisma.demandeMission.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_RH") {
    return { erreur: "Cette demande n'est plus en attente de validation RH." };
  }

  await prisma.demandeMission.update({ where: { id: demandeId }, data: { statut: "VALIDEE_RH" } });

  await enregistrerTransition({
    entiteType: "DemandeMission",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_RH",
    statutNouveau: "VALIDEE_RH",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMission",
    entiteId: demande.id,
    demandeurId: demande.employeConcerneId,
    statutLibelle: "Validée par les Ressources Humaines",
    montant: demande.fraisDeclares,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserMission(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeMission.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_RH") {
    return { erreur: "Cette demande n'est plus en attente de validation RH." };
  }

  await prisma.demandeMission.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeMission",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_RH",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMission",
    entiteId: demande.id,
    demandeurId: demande.employeConcerneId,
    statutLibelle: "Refusée",
    montant: demande.fraisDeclares,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerDemandesMission(filtreStatut?: StatutMission) {
  await requireAccesMission();

  return prisma.demandeMission.findMany({
    where: filtreStatut ? { statut: filtreStatut } : undefined,
    include: {
      employeConcerne: { select: { nom: true, prenom: true } },
      initiateur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderMissions() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) return [];

  return prisma.demandeMission.findMany({
    where: { statut: "EN_ATTENTE_RH" },
    include: {
      employeConcerne: { select: { nom: true, prenom: true } },
      initiateur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "asc" },
  });
}
