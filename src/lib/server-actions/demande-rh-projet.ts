"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { peutValiderRH, resoudreResponsableRH } from "@/lib/server-actions/rh-partage";
import {
  creerDemandeRHProjetSchema,
  validerLigneDirectementSchema,
  contreProposerLigneSchema,
  refuserLigneSchema,
  type CreerDemandeRHProjetInput,
} from "@/types/validations/direction-technique";

const TYPE_MODULE = "direction-technique";
const SOUS_MODULE = "demande-rh-projet";
const LIEN_DETAIL = "/dashboard/direction-technique/demande-rh-projet";

async function requireAccesDemandeRHProjet() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "direction-technique", "demande-rh-projet");
  return utilisateur;
}

async function upsertIndexLigne(
  ligne: { id: string },
  demandeurId: string,
  statutLibelle: string,
  enAttenteValidationUtilisateurId: string | null,
  dateSoumission: Date,
) {
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    demandeurId,
    statutLibelle,
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId,
    lienDetail: LIEN_DETAIL,
    dateSoumission,
  });
}

export async function creerDemandeRHProjet(
  input: CreerDemandeRHProjetInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeRHProjet();

  const analyse = creerDemandeRHProjetSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const responsable = await resoudreResponsableRH();
  if (!responsable) {
    return { erreur: "Aucun responsable RH actif n'est configuré — impossible de créer la demande." };
  }

  const demande = await prisma.demandeRHProjet.create({
    data: {
      projetId: donnees.projetId,
      initiateurId: utilisateur.id,
      lignes: {
        create: donnees.lignes.map((ligne) => ({
          competence: ligne.competence,
          periode: ligne.periode,
          tauxJournalierPropose: ligne.tauxJournalierPropose,
        })),
      },
    },
    include: { lignes: true },
  });

  for (const ligne of demande.lignes) {
    await enregistrerTransition({
      entiteType: "LigneDemandeRHProjet",
      entiteId: ligne.id,
      statutNouveau: "EN_ATTENTE_RH",
      acteurId: utilisateur.id,
    });
    await upsertIndexLigne(
      ligne,
      utilisateur.id,
      "En attente de traitement RH",
      responsable.id,
      demande.dateCreation,
    );
  }

  return { succes: true };
}

export async function validerLigneDirectement(
  ligneIdInput: string,
  ouvrierIdInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const analyse = validerLigneDirectementSchema.safeParse({
    ligneId: ligneIdInput,
    ouvrierId: ouvrierIdInput,
  });
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const { ligneId, ouvrierId } = analyse.data;

  const ligne = await prisma.ligneDemandeRHProjet.findUnique({
    where: { id: ligneId },
    include: { demande: true },
  });
  if (!ligne) return { erreur: "Ligne introuvable." };
  if (ligne.statut !== "EN_ATTENTE_RH") {
    return { erreur: "Cette ligne n'est plus en attente de traitement." };
  }

  await prisma.$transaction([
    prisma.ligneDemandeRHProjet.update({ where: { id: ligneId }, data: { statut: "VALIDEE" } }),
    prisma.affectationProjet.create({
      data: {
        projetId: ligne.demande.projetId,
        ouvrierId,
        competence: ligne.competence,
        tauxJournalier: ligne.tauxJournalierPropose,
        ligneDemandeId: ligneId,
      },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    statutPrecedent: "EN_ATTENTE_RH",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });
  await upsertIndexLigne(
    ligne,
    ligne.demande.initiateurId,
    "Validée",
    null,
    ligne.demande.dateCreation,
  );

  return { succes: true };
}

export async function contreProposerLigne(
  ligneIdInput: string,
  ouvrierIdInput: string,
  competenceProposeeInput: string,
  tauxInput: number,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const analyse = contreProposerLigneSchema.safeParse({
    ligneId: ligneIdInput,
    ouvrierId: ouvrierIdInput,
    competenceProposee: competenceProposeeInput,
    tauxJournalierPropose: tauxInput,
  });
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const ligne = await prisma.ligneDemandeRHProjet.findUnique({
    where: { id: donnees.ligneId },
    include: { demande: true },
  });
  if (!ligne) return { erreur: "Ligne introuvable." };
  if (ligne.statut !== "EN_ATTENTE_RH") {
    return { erreur: "Cette ligne n'est plus en attente de traitement." };
  }

  await prisma.ligneDemandeRHProjet.update({
    where: { id: donnees.ligneId },
    data: {
      statut: "CONTRE_PROPOSEE",
      ouvrierContreProposeId: donnees.ouvrierId,
      competenceContreProposee: donnees.competenceProposee,
      tauxJournalierContrePropose: donnees.tauxJournalierPropose,
    },
  });

  await enregistrerTransition({
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    statutPrecedent: "EN_ATTENTE_RH",
    statutNouveau: "CONTRE_PROPOSEE",
    acteurId: utilisateur.id,
  });
  await upsertIndexLigne(
    ligne,
    ligne.demande.initiateurId,
    "Contre-proposition en attente de réponse",
    ligne.demande.initiateurId,
    ligne.demande.dateCreation,
  );

  return { succes: true };
}

export async function accepterContreProposition(
  ligneId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const ligne = await prisma.ligneDemandeRHProjet.findUnique({
    where: { id: ligneId },
    include: { demande: true },
  });
  if (!ligne) return { erreur: "Ligne introuvable." };
  if (ligne.demande.initiateurId !== utilisateur.id) redirect("/dashboard");
  if (ligne.statut !== "CONTRE_PROPOSEE") {
    return { erreur: "Cette ligne n'a pas de contre-proposition en attente." };
  }
  if (!ligne.ouvrierContreProposeId || !ligne.tauxJournalierContrePropose) {
    return { erreur: "Contre-proposition incomplète." };
  }

  await prisma.$transaction([
    prisma.ligneDemandeRHProjet.update({ where: { id: ligneId }, data: { statut: "VALIDEE" } }),
    prisma.affectationProjet.create({
      data: {
        projetId: ligne.demande.projetId,
        ouvrierId: ligne.ouvrierContreProposeId,
        competence: ligne.competenceContreProposee ?? ligne.competence,
        tauxJournalier: ligne.tauxJournalierContrePropose,
        ligneDemandeId: ligneId,
      },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    statutPrecedent: "CONTRE_PROPOSEE",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });
  await upsertIndexLigne(
    ligne,
    ligne.demande.initiateurId,
    "Validée",
    null,
    ligne.demande.dateCreation,
  );

  return { succes: true };
}

export async function refuserContreProposition(
  ligneId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const ligne = await prisma.ligneDemandeRHProjet.findUnique({
    where: { id: ligneId },
    include: { demande: true },
  });
  if (!ligne) return { erreur: "Ligne introuvable." };
  if (ligne.demande.initiateurId !== utilisateur.id) redirect("/dashboard");
  if (ligne.statut !== "CONTRE_PROPOSEE") {
    return { erreur: "Cette ligne n'a pas de contre-proposition en attente." };
  }

  await prisma.ligneDemandeRHProjet.update({
    where: { id: ligneId },
    data: { statut: "REFUSEE", motifRefus: "Contre-proposition refusée par le demandeur." },
  });

  await enregistrerTransition({
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    statutPrecedent: "CONTRE_PROPOSEE",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
  });
  await upsertIndexLigne(
    ligne,
    ligne.demande.initiateurId,
    "Refusée",
    null,
    ligne.demande.dateCreation,
  );

  return { succes: true };
}

export async function refuserLigne(
  ligneIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserLigneSchema.safeParse({ ligneId: ligneIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { ligneId, motif } = analyse.data;

  const ligne = await prisma.ligneDemandeRHProjet.findUnique({
    where: { id: ligneId },
    include: { demande: true },
  });
  if (!ligne) return { erreur: "Ligne introuvable." };
  if (ligne.statut !== "EN_ATTENTE_RH") {
    return { erreur: "Cette ligne n'est plus en attente de traitement." };
  }

  await prisma.ligneDemandeRHProjet.update({
    where: { id: ligneId },
    data: { statut: "REFUSEE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "LigneDemandeRHProjet",
    entiteId: ligne.id,
    statutPrecedent: "EN_ATTENTE_RH",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertIndexLigne(
    ligne,
    ligne.demande.initiateurId,
    "Refusée",
    null,
    ligne.demande.dateCreation,
  );

  return { succes: true };
}

export async function listerDemandesRHProjet() {
  await requireAccesDemandeRHProjet();

  return prisma.demandeRHProjet.findMany({
    include: {
      projet: { select: { nom: true } },
      initiateur: { select: { nom: true, prenom: true } },
      lignes: {
        include: { ouvrierContrePropose: { select: { nom: true, prenom: true } } },
      },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerLignesAValiderRH() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) return [];

  return prisma.ligneDemandeRHProjet.findMany({
    where: { statut: "EN_ATTENTE_RH" },
    include: {
      demande: { include: { projet: { select: { nom: true } }, initiateur: { select: { nom: true, prenom: true } } } },
    },
    orderBy: { dateModification: "asc" },
  });
}

export async function listerContrePropositionsAValider() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.ligneDemandeRHProjet.findMany({
    where: { statut: "CONTRE_PROPOSEE", demande: { initiateurId: utilisateur.id } },
    include: {
      demande: { include: { projet: { select: { nom: true } } } },
      ouvrierContrePropose: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateModification: "asc" },
  });
}

export async function listerOuvriers() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.utilisateur.findMany({
    where: { statut: "ACTIF", profilEmploye: { typeProfil: "OUVRIER" } },
    select: { id: true, nom: true, prenom: true },
    orderBy: { nom: "asc" },
  });
}
