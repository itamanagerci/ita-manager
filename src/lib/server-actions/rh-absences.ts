"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  creerDemandeAbsenceSchema,
  refuserSchema,
  type CreerDemandeAbsenceInput,
} from "@/types/validations/rh";

const TYPE_MODULE = "rh";
const SOUS_MODULE = "conge-permission";
const LIEN_DETAIL = "/dashboard/rh/conge-permission";

async function requireAccesCongePermission() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "rh", "conge-permission");
  return utilisateur;
}

function joursInclusifs(dateDebut: Date, dateFin: Date): number {
  const jour = 24 * 60 * 60 * 1000;
  return Math.floor((dateFin.getTime() - dateDebut.getTime()) / jour) + 1;
}

export async function creerDemandeAbsence(
  input: CreerDemandeAbsenceInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesCongePermission();

  const analyse = creerDemandeAbsenceSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const employe = await prisma.utilisateur.findUniqueOrThrow({ where: { id: utilisateur.id } });
  if (!employe.superieurId) {
    return {
      erreur: "Aucun supérieur hiérarchique n'est renseigné sur votre profil — impossible de soumettre une demande.",
    };
  }
  if (!(await possedeAccesSousModule(employe.superieurId, "rh", "conge-permission"))) {
    return {
      erreur:
        "Le supérieur hiérarchique désigné n'a pas accès au sous-module congés/permissions — impossible de soumettre une demande.",
    };
  }

  const dateDebut = new Date(donnees.dateDebut);
  let joursCalcules = 0;

  if (donnees.type === "CONGE") {
    const dateFin = new Date(donnees.dateFin!);
    joursCalcules = joursInclusifs(dateDebut, dateFin);

    const profil = await prisma.profilEmploye.findUnique({ where: { utilisateurId: utilisateur.id } });
    if (!profil) {
      return { erreur: "Profil RH incomplet — solde de congés inconnu." };
    }
    if (profil.soldeConges < joursCalcules) {
      return { erreur: "Solde de congés insuffisant pour cette demande." };
    }
  }

  const demande = await prisma.demandeAbsence.create({
    data: {
      employeId: utilisateur.id,
      type: donnees.type,
      dateDebut,
      dateFin: donnees.type === "CONGE" ? new Date(donnees.dateFin!) : null,
      dureeHeures: donnees.type === "PERMISSION" ? donnees.dureeHeures : null,
      motif: donnees.motif,
      impacteSoldeConges: donnees.type === "CONGE",
      superieurId: employe.superieurId,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_SUPERIEUR",
    acteurId: utilisateur.id,
  });

  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente du supérieur hiérarchique",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: employe.superieurId,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerAbsence(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const demande = await prisma.demandeAbsence.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.superieurId !== utilisateur.id) redirect("/dashboard");
  if (demande.statut !== "EN_ATTENTE_SUPERIEUR") {
    return { erreur: "Cette demande n'est plus en attente." };
  }

  if (demande.impacteSoldeConges) {
    const joursCalcules = joursInclusifs(demande.dateDebut, demande.dateFin!);

    const resultat = await prisma.$transaction(async (tx) => {
      const decrement = await tx.profilEmploye.updateMany({
        where: { utilisateurId: demande.employeId, soldeConges: { gte: joursCalcules } },
        data: { soldeConges: { decrement: joursCalcules } },
      });
      if (decrement.count === 0) return null;

      return tx.demandeAbsence.update({ where: { id: demandeId }, data: { statut: "VALIDEE" } });
    });

    if (!resultat) {
      return { erreur: "Solde de congés insuffisant au moment de la validation." };
    }
  } else {
    await prisma.demandeAbsence.update({ where: { id: demandeId }, data: { statut: "VALIDEE" } });
  }

  await enregistrerTransition({
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_SUPERIEUR",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    demandeurId: demande.employeId,
    statutLibelle: "Validée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserAbsence(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const analyse = refuserSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeAbsence.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.superieurId !== utilisateur.id) redirect("/dashboard");
  if (demande.statut !== "EN_ATTENTE_SUPERIEUR") {
    return { erreur: "Cette demande n'est plus en attente." };
  }

  await prisma.demandeAbsence.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_SUPERIEUR",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAbsence",
    entiteId: demande.id,
    demandeurId: demande.employeId,
    statutLibelle: "Refusée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerMesAbsences() {
  const utilisateur = await requireAccesCongePermission();

  return prisma.demandeAbsence.findMany({
    where: { employeId: utilisateur.id },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderAbsences() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.demandeAbsence.findMany({
    where: { superieurId: utilisateur.id, statut: "EN_ATTENTE_SUPERIEUR" },
    include: { employe: { select: { nom: true, prenom: true } } },
    orderBy: { dateCreation: "asc" },
  });
}

export async function listerToutesAbsencesRH() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await possedeAccesSousModule(utilisateur.id, "rh", "creation-profil"))) return [];

  return prisma.demandeAbsence.findMany({
    include: {
      employe: { select: { nom: true, prenom: true } },
      superieur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}
