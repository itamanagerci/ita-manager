"use server";

import { redirect } from "next/navigation";
import type { StatutDemandeMateriel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  creerDemandeMaterielSchema,
  refuserDemandeMaterielSchema,
  type CreerDemandeMaterielInput,
} from "@/types/validations/direction-technique";

const TYPE_MODULE = "direction-technique";
const SOUS_MODULE = "demande-logistique";
const LIEN_DETAIL = "/dashboard/direction-technique/demande-logistique";

async function requireAccesDemandeLogistique() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "direction-technique", "demande-logistique");
  return utilisateur;
}

/**
 * Signal provisoire "responsable Logistique" pour ce sous-module — même
 * principe que carburant/depots (Lot 3), appliqué à logistique/magasins
 * (aucun sous-module "validation" dédié n'existe dans le référentiel
 * Service Logistique déjà seedé). Cf. CLAUDE.md.
 */
async function peutValiderLogistiqueMateriel(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

async function resoudreResponsableLogistiqueMateriel() {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      actif: true,
      utilisateur: { statut: "ACTIF" },
      sousModule: { code: "magasins", actif: true, module: { code: "logistique" } },
    },
    include: { utilisateur: true },
    orderBy: { utilisateur: { dateCreation: "asc" } },
  });

  return acces?.utilisateur ?? null;
}

export async function creerDemandeMateriel(
  input: CreerDemandeMaterielInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeLogistique();

  const analyse = creerDemandeMaterielSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const responsable = await resoudreResponsableLogistiqueMateriel();
  if (!responsable) {
    return {
      erreur:
        "Aucun responsable Logistique actif n'est configuré — impossible de créer la demande.",
    };
  }

  const demande = await prisma.demandeMateriel.create({
    data: {
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      materielId: donnees.materielId,
      delaiSouhaite: new Date(donnees.delaiSouhaite),
      initiateurId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_LOGISTIQUE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente Logistique",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsable.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerDemandeMateriel(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderLogistiqueMateriel(utilisateur.id))) redirect("/dashboard");

  const demande = await prisma.demandeMateriel.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_LOGISTIQUE") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeMateriel.update({ where: { id: demandeId }, data: { statut: "VALIDEE" } });

  await enregistrerTransition({
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_LOGISTIQUE",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    demandeurId: demande.initiateurId,
    statutLibelle: "Validée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserDemandeMateriel(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderLogistiqueMateriel(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserDemandeMaterielSchema.safeParse({
    demandeId: demandeIdInput,
    motif: motifInput,
  });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeMateriel.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_LOGISTIQUE") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeMateriel.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_LOGISTIQUE",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeMateriel",
    entiteId: demande.id,
    demandeurId: demande.initiateurId,
    statutLibelle: "Refusée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerDemandesMateriel(filtreStatut?: StatutDemandeMateriel) {
  await requireAccesDemandeLogistique();

  return prisma.demandeMateriel.findMany({
    where: filtreStatut ? { statut: filtreStatut } : undefined,
    include: {
      materiel: true,
      projet: { select: { nom: true } },
      initiateur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerMateriels() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.materiel.findMany({ orderBy: { designation: "asc" } });
}
