"use server";

import { redirect } from "next/navigation";
import type { StatutDemandeCarburant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  creerDemandeCarburantSchema,
  reapprovisionnerSchema,
  refuserDemandeSchema,
  type CreerDemandeCarburantInput,
  type ReapprovisionnerInput,
} from "@/types/validations/carburant";

const TYPE_MODULE = "carburant";
const SOUS_MODULE = "demande-carburant";
const LIEN_DETAIL = "/dashboard/carburant/demande-carburant";

export async function peutValiderLogistique(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "carburant", "depots");
}

export async function peutValiderDG(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "direction-generale", "validations-centralisees");
}

async function requireAccesDemandeCarburant() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "carburant", "demande-carburant");
  return utilisateur;
}

async function requireAccesDepots() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "carburant", "depots");
  return utilisateur;
}

/**
 * Garde combinée de la page demande-carburant : accessible à quiconque peut
 * demander OU valider (Logistique ou DG) — pas un simple requireAccesModule
 * unique, cette page sert plusieurs publics distincts sur un seul écran.
 */
export async function requireAccesCarburantQuelconque() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const [peutDemander, peutLogistique, peutDG] = await Promise.all([
    possedeAccesSousModule(utilisateur.id, "carburant", "demande-carburant"),
    peutValiderLogistique(utilisateur.id),
    peutValiderDG(utilisateur.id),
  ]);

  if (!peutDemander && !peutLogistique && !peutDG) redirect("/dashboard");

  return { utilisateur, peutDemander, peutLogistique, peutDG };
}

/**
 * Premier Utilisateur actif (statut ACTIF, pas seulement AccesUtilisateur.actif)
 * ayant accès à carburant/depots, par ancienneté de compte — la personne vers
 * qui router l'étape Logistique via enAttenteValidationUtilisateurId.
 * Limitation connue : ne généralise pas à plusieurs responsables simultanés
 * (cf. CLAUDE.md).
 */
async function resoudreResponsableLogistique() {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      actif: true,
      utilisateur: { statut: "ACTIF" },
      sousModule: { code: "depots", actif: true, module: { code: "carburant" } },
    },
    include: { utilisateur: true },
    orderBy: { utilisateur: { dateCreation: "asc" } },
  });

  return acces?.utilisateur ?? null;
}

async function cumulMensuelValide(vehiculeId: string): Promise<number> {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const demandes = await prisma.demandeCarburant.findMany({
    where: { vehiculeId, statut: "VALIDEE", dateCreation: { gte: debutMois } },
    select: { quantiteDemandeeLitres: true },
  });

  return demandes.reduce((total, d) => total + d.quantiteDemandeeLitres, 0);
}

export async function creerDemandeCarburant(
  input: CreerDemandeCarburantInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeCarburant();

  const analyse = creerDemandeCarburantSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const depot = await prisma.depot.findUnique({ where: { id: donnees.depotSourceId } });
  if (!depot) return { erreur: "Dépôt introuvable." };
  if (depot.quantiteStockLitres < donnees.quantiteDemandeeLitres) {
    return { erreur: "Stock insuffisant dans ce dépôt pour cette demande." };
  }

  const vehicule = await prisma.vehicule.findUnique({ where: { id: donnees.vehiculeId } });
  if (!vehicule) return { erreur: "Véhicule introuvable." };

  const responsable = await resoudreResponsableLogistique();
  if (!responsable) {
    return {
      erreur:
        "Aucun responsable Logistique/Carburant actif n'est configuré — impossible de créer la demande.",
    };
  }

  const cumulMensuel = await cumulMensuelValide(donnees.vehiculeId);

  const demande = await prisma.demandeCarburant.create({
    data: {
      vehiculeId: donnees.vehiculeId,
      depotSourceId: donnees.depotSourceId,
      kilometrageCompteur: donnees.kilometrageCompteur,
      quantiteDemandeeLitres: donnees.quantiteDemandeeLitres,
      chantierMission: donnees.chantierMission,
      demandeurId: utilisateur.id,
      cumulMensuelAvant: cumulMensuel,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_LOGISTIQUE",
    acteurId: utilisateur.id,
  });

  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de traitement Logistique",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsable.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerParLogistique(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDepots();

  const demande = await prisma.demandeCarburant.findUnique({
    where: { id: demandeId },
    include: { vehicule: true },
  });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_LOGISTIQUE") {
    return { erreur: "Cette demande n'est plus en attente de traitement Logistique." };
  }

  const horsQuota =
    demande.cumulMensuelAvant + demande.quantiteDemandeeLitres > demande.vehicule.quotaMensuelLitres;

  if (!horsQuota) {
    const resultat = await prisma.$transaction(async (tx) => {
      const decrement = await tx.depot.updateMany({
        where: { id: demande.depotSourceId, quantiteStockLitres: { gte: demande.quantiteDemandeeLitres } },
        data: { quantiteStockLitres: { decrement: demande.quantiteDemandeeLitres } },
      });
      if (decrement.count === 0) return null;

      return tx.demandeCarburant.update({
        where: { id: demandeId },
        data: { statut: "VALIDEE" },
      });
    });

    if (!resultat) {
      return { erreur: "Stock insuffisant dans le dépôt au moment de la validation." };
    }

    await enregistrerTransition({
      entiteType: "DemandeCarburant",
      entiteId: demande.id,
      statutPrecedent: "EN_ATTENTE_LOGISTIQUE",
      statutNouveau: "VALIDEE",
      acteurId: utilisateur.id,
    });
    await upsertDemandeIndex({
      typeModule: TYPE_MODULE,
      sousModule: SOUS_MODULE,
      reference: null,
      entiteType: "DemandeCarburant",
      entiteId: demande.id,
      demandeurId: demande.demandeurId,
      statutLibelle: "Validée",
      montant: null,
      enAttenteValidationDe: null,
      enAttenteValidationUtilisateurId: null,
      lienDetail: LIEN_DETAIL,
      dateSoumission: demande.dateCreation,
    });

    return { succes: true };
  }

  await prisma.demandeCarburant.update({
    where: { id: demandeId },
    data: { statut: "EN_ATTENTE_DG" },
  });

  await enregistrerTransition({
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_LOGISTIQUE",
    statutNouveau: "EN_ATTENTE_DG",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "En attente de la Direction Générale",
    montant: null,
    enAttenteValidationDe: "DIRECTEUR",
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerParDG(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDG(utilisateur.id))) redirect("/dashboard");

  const demande = await prisma.demandeCarburant.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DG") {
    return { erreur: "Cette demande n'est plus en attente de validation DG." };
  }

  const resultat = await prisma.$transaction(async (tx) => {
    const decrement = await tx.depot.updateMany({
      where: { id: demande.depotSourceId, quantiteStockLitres: { gte: demande.quantiteDemandeeLitres } },
      data: { quantiteStockLitres: { decrement: demande.quantiteDemandeeLitres } },
    });
    if (decrement.count === 0) return null;

    return tx.demandeCarburant.update({
      where: { id: demandeId },
      data: { statut: "VALIDEE" },
    });
  });

  if (!resultat) {
    return { erreur: "Stock insuffisant dans le dépôt au moment de la validation." };
  }

  await enregistrerTransition({
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DG",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Validée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserDemande(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const analyse = refuserDemandeSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeCarburant.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };

  if (demande.statut === "EN_ATTENTE_LOGISTIQUE") {
    if (!(await peutValiderLogistique(utilisateur.id))) redirect("/dashboard");
  } else if (demande.statut === "EN_ATTENTE_DG") {
    if (!(await peutValiderDG(utilisateur.id))) redirect("/dashboard");
  } else {
    return { erreur: "Cette demande n'est plus en attente de traitement." };
  }

  const statutPrecedent = demande.statut;

  await prisma.demandeCarburant.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    statutPrecedent,
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeCarburant",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Refusée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerDemandesCarburant(filtreStatut?: StatutDemandeCarburant) {
  await requireAccesCarburantQuelconque();

  return prisma.demandeCarburant.findMany({
    where: filtreStatut ? { statut: filtreStatut } : undefined,
    include: {
      vehicule: true,
      depotSource: true,
      demandeur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerDemandesAValider() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const [logistique, dg] = await Promise.all([
    peutValiderLogistique(utilisateur.id),
    peutValiderDG(utilisateur.id),
  ]);

  const statuts: StatutDemandeCarburant[] = [];
  if (logistique) statuts.push("EN_ATTENTE_LOGISTIQUE");
  if (dg) statuts.push("EN_ATTENTE_DG");
  if (statuts.length === 0) return [];

  return prisma.demandeCarburant.findMany({
    where: { statut: { in: statuts } },
    include: {
      vehicule: true,
      depotSource: true,
      demandeur: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "asc" },
  });
}

export async function listerVehicules() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.vehicule.findMany({ orderBy: { immatriculation: "asc" } });
}

export async function listerDepots() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.depot.findMany({ orderBy: { nom: "asc" } });
}

export async function reapprovisionner(
  input: ReapprovisionnerInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDepots();

  const analyse = reapprovisionnerSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.$transaction([
    prisma.reapprovisionnement.create({
      data: {
        depotId: donnees.depotId,
        quantiteLitres: donnees.quantiteLitres,
        fournisseur: donnees.fournisseur,
        effectueParId: utilisateur.id,
      },
    }),
    prisma.depot.update({
      where: { id: donnees.depotId },
      data: { quantiteStockLitres: { increment: donnees.quantiteLitres } },
    }),
  ]);

  return { succes: true };
}
