"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { resoudreResponsableAchat } from "@/lib/server-actions/achat-partage";
import {
  creerDemandeAchatSchema,
  refuserDemandeAchatSchema,
  type CreerDemandeAchatInput,
} from "@/types/validations/achat";

const TYPE_MODULE = "achat";
const SOUS_MODULE = "demande-achat";
const LIEN_DETAIL = "/dashboard/achat/demande-achat";

function reference(numero: number): string {
  return `ACH-${String(numero).padStart(5, "0")}`;
}

async function requireAccesDemandeAchat() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "demande-achat");
  return utilisateur;
}

/**
 * Désignations seules — jamais fournisseur/prix. Vérification côté serveur
 * (même principe que la restriction catégorie RH de l'archivage
 * documentaire, Lot 2) : cette requête, jamais listerArticles() (Lot 5,
 * direction-technique/liste-articles) qui expose ces deux champs, est le
 * seul chemin de lecture d'Article ouvert au demandeur. Cf. CLAUDE.md.
 */
export async function listerArticlesPourDemandeAchat() {
  await requireAccesDemandeAchat();
  return prisma.article.findMany({
    select: { id: true, designation: true },
    orderBy: { designation: "asc" },
  });
}

/**
 * Liste légère (id/nom), gatée par demande-achat plutôt que
 * direction-technique/gestion-projet (listerProjets() existant) — un
 * demandeur Achat (ex: Chef de chantier) n'a pas forcément cet accès.
 */
export async function listerProjetsPourDemandeAchat() {
  await requireAccesDemandeAchat();
  return prisma.projet.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
}

async function resoudreEtVerifierDirecteur(
  demandeurId: string,
): Promise<{ erreur: string } | { directeurId: string }> {
  const demandeur = await prisma.utilisateur.findUnique({ where: { id: demandeurId } });
  if (!demandeur) return { erreur: "Demandeur introuvable." };
  if (!demandeur.superieurId) {
    return {
      erreur:
        "Aucun supérieur hiérarchique (Directeur de département) n'est renseigné pour ce demandeur — impossible de soumettre une demande.",
    };
  }
  if (!(await possedeAccesSousModule(demandeur.superieurId, "achat", "demande-achat"))) {
    return {
      erreur:
        "Le supérieur hiérarchique désigné n'a pas accès au sous-module Demande d'achat — impossible de soumettre une demande.",
    };
  }
  return { directeurId: demandeur.superieurId };
}

export async function creerDemandeAchat(
  input: CreerDemandeAchatInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeAchat();

  const analyse = creerDemandeAchatSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demandeurId = donnees.demandeurId || utilisateur.id;
  const emetteurId = donnees.emetteurId || demandeurId;

  const resolution = await resoudreEtVerifierDirecteur(demandeurId);
  if ("erreur" in resolution) return resolution;

  const demande = await prisma.demandeAchat.create({
    data: {
      forType: donnees.forType,
      forServiceModuleCode: donnees.forType === "SERVICE" ? donnees.forServiceModuleCode : null,
      projetId: donnees.forType === "CHANTIER" ? donnees.projetId || null : null,
      chantierLibre: donnees.forType === "CHANTIER" ? donnees.chantierLibre || null : null,
      lieuLivraisonProjetId: donnees.lieuLivraisonProjetId || null,
      lieuLivraisonLibre: donnees.lieuLivraisonLibre || null,
      dateLivraisonSouhaitee: new Date(donnees.dateLivraisonSouhaitee),
      justification: donnees.justification,
      demandeurId,
      emetteurId,
      creeParId: utilisateur.id,
      directeurDepartementId: resolution.directeurId,
      lignes: {
        create: donnees.lignes.map((ligne) => ({
          articleId: ligne.articleId || null,
          designationLibre: ligne.designationLibre || null,
          quantite: ligne.quantite,
        })),
      },
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_DIRECTEUR",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: reference(demande.numero),
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    demandeurId,
    statutLibelle: "En attente du Directeur de département",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: resolution.directeurId,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerMesDemandesAchat() {
  const utilisateur = await requireAccesDemandeAchat();
  return prisma.demandeAchat.findMany({
    where: { demandeurId: utilisateur.id },
    include: { lignes: { include: { article: { select: { designation: true } } } } },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderDirecteurAchat() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.demandeAchat.findMany({
    where: { directeurDepartementId: utilisateur.id, statut: "EN_ATTENTE_DIRECTEUR" },
    include: {
      lignes: { include: { article: { select: { designation: true } } } },
      demandeur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "asc" },
  });
}

export async function validerDemandeAchatDirecteur(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const demande = await prisma.demandeAchat.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.directeurDepartementId !== utilisateur.id) redirect("/dashboard");
  if (demande.statut !== "EN_ATTENTE_DIRECTEUR") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeAchat.update({
    where: { id: demandeId },
    data: { statut: "EN_ATTENTE_TRAITEMENT_ACHAT", dateValidationDirecteur: new Date() },
  });

  await enregistrerTransition({
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DIRECTEUR",
    statutNouveau: "EN_ATTENTE_TRAITEMENT_ACHAT",
    acteurId: utilisateur.id,
  });

  const responsableAchat = await resoudreResponsableAchat();
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: reference(demande.numero),
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "En attente de traitement Achat",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsableAchat?.id ?? null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserDemandeAchatDirecteur(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const analyse = refuserDemandeAchatSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeAchat.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.directeurDepartementId !== utilisateur.id) redirect("/dashboard");
  if (demande.statut !== "EN_ATTENTE_DIRECTEUR") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeAchat.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motifRefus: motif, etapeBlocage: "DIRECTEUR" },
  });

  await enregistrerTransition({
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DIRECTEUR",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: reference(demande.numero),
    entiteType: "DemandeAchat",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Refusée par le Directeur de département",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

/**
 * Refus Directeur (étape 2) : rien n'a encore été traité côté Achat, donc
 * la resoumission renvoie directement à l'étape 2 — pas de remise à zéro
 * des validateurs parallèles (aucun n'existe encore à ce stade). Cf.
 * CLAUDE.md.
 */
export async function resoumettreApresRefusDirecteur(
  demandeId: string,
  input: CreerDemandeAchatInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeAchat();

  const demandeExistante = await prisma.demandeAchat.findUnique({ where: { id: demandeId } });
  if (!demandeExistante) return { erreur: "Demande introuvable." };
  if (
    demandeExistante.demandeurId !== utilisateur.id &&
    demandeExistante.creeParId !== utilisateur.id
  ) {
    redirect("/dashboard");
  }
  if (demandeExistante.statut !== "REFUSEE" || demandeExistante.etapeBlocage !== "DIRECTEUR") {
    return { erreur: "Cette demande n'est pas en attente de resoumission au Directeur." };
  }

  const analyse = creerDemandeAchatSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demandeurId = donnees.demandeurId || demandeExistante.demandeurId;
  const emetteurId = donnees.emetteurId || demandeurId;

  const resolution = await resoudreEtVerifierDirecteur(demandeurId);
  if ("erreur" in resolution) return resolution;

  await prisma.$transaction([
    prisma.ligneDemandeAchat.deleteMany({ where: { demandeId } }),
    prisma.demandeAchat.update({
      where: { id: demandeId },
      data: {
        forType: donnees.forType,
        forServiceModuleCode: donnees.forType === "SERVICE" ? donnees.forServiceModuleCode : null,
        projetId: donnees.forType === "CHANTIER" ? donnees.projetId || null : null,
        chantierLibre: donnees.forType === "CHANTIER" ? donnees.chantierLibre || null : null,
        lieuLivraisonProjetId: donnees.lieuLivraisonProjetId || null,
        lieuLivraisonLibre: donnees.lieuLivraisonLibre || null,
        dateLivraisonSouhaitee: new Date(donnees.dateLivraisonSouhaitee),
        justification: donnees.justification,
        demandeurId,
        emetteurId,
        statut: "EN_ATTENTE_DIRECTEUR",
        motifRefus: null,
        etapeBlocage: null,
        directeurDepartementId: resolution.directeurId,
        dateValidationDirecteur: null,
        lignes: {
          create: donnees.lignes.map((ligne) => ({
            articleId: ligne.articleId || null,
            designationLibre: ligne.designationLibre || null,
            quantite: ligne.quantite,
          })),
        },
      },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "DemandeAchat",
    entiteId: demandeId,
    statutPrecedent: "REFUSEE",
    statutNouveau: "EN_ATTENTE_DIRECTEUR",
    acteurId: utilisateur.id,
    commentaire: "Resoumission après refus du Directeur",
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: reference(demandeExistante.numero),
    entiteType: "DemandeAchat",
    entiteId: demandeId,
    demandeurId,
    statutLibelle: "En attente du Directeur de département",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: resolution.directeurId,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demandeExistante.dateCreation,
  });

  return { succes: true };
}
