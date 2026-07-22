"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { creerOuReutiliserDemandeReapprovisionnement } from "@/lib/server-actions/seuil-alerte";
import {
  creerDemandeMiseADispositionSchema,
  verifierStockDMSSchema,
  deciderDMSSchema,
  type CreerDemandeMiseADispositionInput,
  type VerifierStockDMSInput,
  type DeciderDMSInput,
} from "@/types/validations/logistique";

const TYPE_MODULE = "logistique";
const SOUS_MODULE = "flux-sortie";
const LIEN_DETAIL = "/dashboard/logistique/flux-sortie";

async function requireAccesFluxSortie() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "flux-sortie");
  return utilisateur;
}

async function peutDeciderDMS(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

/**
 * Garde combinée : demandeur (accès flux-sortie), Chef Magasin (responsable
 * d'au moins un magasin) ou Logisticien (accès magasins) — même pattern que
 * requireAccesCarburantQuelconque() (Lot 3), cette page sert plusieurs
 * publics distincts.
 */
export async function requireAccesFluxSortieQuelconque() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const [peutDemander, estResponsableMagasin, peutDecider] = await Promise.all([
    possedeAccesSousModule(utilisateur.id, "logistique", "flux-sortie"),
    prisma.magasin.findFirst({ where: { responsableId: utilisateur.id } }),
    peutDeciderDMS(utilisateur.id),
  ]);

  if (!peutDemander && !estResponsableMagasin && !peutDecider) redirect("/dashboard");

  return { utilisateur, peutDemander, estResponsableMagasin: !!estResponsableMagasin, peutDecider };
}

/**
 * Premier Utilisateur actif avec accès logistique/magasins, par ancienneté
 * de compte — même pattern que resoudreResponsableLogistique() (Lot 3) et
 * resoudreResponsableLogistiqueMateriel() (Lot 5).
 */
async function resoudreLogisticien() {
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

export async function creerDemandeMiseADisposition(
  input: CreerDemandeMiseADispositionInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesFluxSortie();

  const analyse = creerDemandeMiseADispositionSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const magasin = await prisma.magasin.findUnique({ where: { id: donnees.magasinId } });
  if (!magasin) return { erreur: "Magasin introuvable." };
  if (!magasin.responsableId) {
    return {
      erreur: "Ce magasin n'a pas de Chef Magasin désigné — impossible de créer la demande.",
    };
  }

  const demande = await prisma.demandeMiseADisposition.create({
    data: {
      magasinId: donnees.magasinId,
      chantierService: donnees.chantierService,
      urgence: donnees.urgence,
      justificationUrgence: donnees.justificationUrgence || null,
      demandeurId: utilisateur.id,
      demandeurPoste: donnees.demandeurPoste,
      demandeurTelephone: donnees.demandeurTelephone,
      lignes: {
        create: donnees.lignes.map((ligne) => ({
          materielId: ligne.materielId,
          quantiteDemandee: ligne.quantiteDemandee,
        })),
      },
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_VERIFICATION",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DMS-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de vérification du Chef Magasin",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: magasin.responsableId,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function verifierStockDMS(
  input: VerifierStockDMSInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const analyse = verifierStockDMSSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeMiseADisposition.findUnique({
    where: { id: donnees.demandeId },
    include: { magasin: true },
  });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.magasin.responsableId !== utilisateur.id) redirect("/dashboard");
  if (demande.statut !== "EN_ATTENTE_VERIFICATION") {
    return { erreur: "Cette demande n'est plus en attente de vérification." };
  }

  const logisticien = await resoudreLogisticien();
  if (!logisticien) {
    return {
      erreur: "Aucun Responsable Service Logistique actif n'est configuré — impossible de continuer.",
    };
  }

  await prisma.demandeMiseADisposition.update({
    where: { id: donnees.demandeId },
    data: {
      statut: "EN_ATTENTE_DECISION",
      verificationStatut: donnees.verificationStatut,
      verificationObservations: donnees.verificationObservations || null,
      verifieParId: utilisateur.id,
      dateVerification: new Date(),
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_VERIFICATION",
    statutNouveau: "EN_ATTENTE_DECISION",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DMS-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "En attente de décision du Logisticien",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: logisticien.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function deciderDMS(input: DeciderDMSInput): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutDeciderDMS(utilisateur.id))) redirect("/dashboard");

  const analyse = deciderDMSSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeMiseADisposition.findUnique({
    where: { id: donnees.demandeId },
    include: { lignes: true },
  });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DECISION") {
    return { erreur: "Cette demande n'est plus en attente de décision." };
  }

  let statutLibelle: string;

  if (donnees.decision === "APPROUVEE") {
    const resultat = await prisma.$transaction(async (tx) => {
      for (const ligne of demande.lignes) {
        const decrement = await tx.materiel.updateMany({
          where: { id: ligne.materielId, quantiteStock: { gte: ligne.quantiteDemandee } },
          data: { quantiteStock: { decrement: ligne.quantiteDemandee } },
        });
        if (decrement.count === 0) return null;

        const materiel = await tx.materiel.findUniqueOrThrow({ where: { id: ligne.materielId } });
        await tx.mouvementStock.create({
          data: {
            materielId: ligne.materielId,
            type: "SORTIE",
            quantite: ligne.quantiteDemandee,
            quantiteApresMouvement: materiel.quantiteStock ?? 0,
            motif: demande.chantierService,
            effectueParId: utilisateur.id,
          },
        });
      }

      await tx.demandeMiseADisposition.update({
        where: { id: donnees.demandeId },
        data: { statut: "APPROUVEE", decision: "APPROUVEE", decideParId: utilisateur.id, dateDecision: new Date() },
      });

      return tx.bonSortieMagasin.create({
        data: {
          demandeId: demande.id,
          magasinId: demande.magasinId,
          destinataireChantier: demande.chantierService,
          preparateurId: demande.verifieParId,
        },
      });
    });

    if (!resultat) {
      return { erreur: "Stock insuffisant sur au moins un article au moment de la décision." };
    }
    statutLibelle = "Approuvée — bon de sortie émis";
  } else if (donnees.decision === "TRANSFERT_INTER_MAGASIN") {
    const magasinCibleId = donnees.magasinCibleId!;
    const resultat = await prisma.$transaction(async (tx) => {
      for (const ligne of demande.lignes) {
        const decrement = await tx.materiel.updateMany({
          where: { id: ligne.materielId, quantiteStock: { gte: ligne.quantiteDemandee } },
          data: { quantiteStock: { decrement: ligne.quantiteDemandee } },
        });
        if (decrement.count === 0) return null;

        const materielSource = await tx.materiel.findUniqueOrThrow({ where: { id: ligne.materielId } });
        await tx.mouvementStock.create({
          data: {
            materielId: ligne.materielId,
            type: "SORTIE",
            quantite: ligne.quantiteDemandee,
            quantiteApresMouvement: materielSource.quantiteStock ?? 0,
            motif: `Transfert vers ${magasinCibleId}`,
            effectueParId: utilisateur.id,
          },
        });

        const materielCible = await tx.materiel.findFirst({
          where: { magasinId: magasinCibleId, designation: materielSource.designation },
        });
        if (!materielCible) return "cible_introuvable" as const;

        const materielCibleMisAJour = await tx.materiel.update({
          where: { id: materielCible.id },
          data: { quantiteStock: { increment: ligne.quantiteDemandee } },
        });
        await tx.mouvementStock.create({
          data: {
            materielId: materielCible.id,
            type: "ENTREE",
            quantite: ligne.quantiteDemandee,
            quantiteApresMouvement: materielCibleMisAJour.quantiteStock ?? 0,
            motif: `Transfert depuis ${demande.magasinId}`,
            effectueParId: utilisateur.id,
          },
        });
      }

      await tx.demandeMiseADisposition.update({
        where: { id: donnees.demandeId },
        data: {
          statut: "TRANSFERT_INTER_MAGASIN",
          decision: "TRANSFERT_INTER_MAGASIN",
          decideParId: utilisateur.id,
          dateDecision: new Date(),
        },
      });

      return "ok" as const;
    });

    if (resultat === null) {
      return { erreur: "Stock insuffisant sur au moins un article au moment de la décision." };
    }
    if (resultat === "cible_introuvable") {
      return { erreur: "Aucune fiche article équivalente n'existe dans le magasin cible." };
    }
    statutLibelle = "Transfert inter-magasin effectué";
  } else if (donnees.decision === "DEMANDE_ACHAT_DECLENCHEE") {
    const premiereLigne = demande.lignes[0];
    const demandeReappro = await creerOuReutiliserDemandeReapprovisionnement(
      premiereLigne.materielId,
      utilisateur.id,
    );

    await prisma.demandeMiseADisposition.update({
      where: { id: donnees.demandeId },
      data: {
        statut: "DEMANDE_ACHAT_DECLENCHEE",
        decision: "DEMANDE_ACHAT_DECLENCHEE",
        decideParId: utilisateur.id,
        dateDecision: new Date(),
        demandeReapprovisionnementId: demandeReappro.id,
      },
    });
    statutLibelle = "Demande d'achat déclenchée — en attente du module Achat (Lot 7)";
  } else {
    if (!donnees.motifRefus) return { erreur: "Le motif est requis." };
    await prisma.demandeMiseADisposition.update({
      where: { id: donnees.demandeId },
      data: {
        statut: "REFUSEE",
        decision: "REFUSEE",
        motifRefus: donnees.motifRefus,
        decideParId: utilisateur.id,
        dateDecision: new Date(),
      },
    });
    statutLibelle = "Refusée";
  }

  await enregistrerTransition({
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DECISION",
    statutNouveau: donnees.decision,
    acteurId: utilisateur.id,
    commentaire: donnees.motifRefus,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DMS-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeMiseADisposition",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle,
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function confirmerReceptionBSM(bsmId: string): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const bsm = await prisma.bonSortieMagasin.findUnique({
    where: { id: bsmId },
    include: { demande: true },
  });
  if (!bsm) return { erreur: "Bon de sortie introuvable." };
  if (bsm.demande.demandeurId !== utilisateur.id) redirect("/dashboard");
  if (bsm.statut !== "EMIS") return { erreur: "Ce bon de sortie a déjà été réceptionné." };

  await prisma.bonSortieMagasin.update({
    where: { id: bsmId },
    data: { statut: "RECU", recuParId: utilisateur.id, dateReception: new Date() },
  });

  return { succes: true };
}

export async function listerDemandesMiseADisposition() {
  await requireAccesFluxSortieQuelconque();

  return prisma.demandeMiseADisposition.findMany({
    include: {
      magasin: true,
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
      bonSortie: true,
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAVerifierDMS() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.demandeMiseADisposition.findMany({
    where: { statut: "EN_ATTENTE_VERIFICATION", magasin: { responsableId: utilisateur.id } },
    include: {
      magasin: true,
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "asc" },
  });
}

export async function listerADeciderDMS() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutDeciderDMS(utilisateur.id))) return [];

  return prisma.demandeMiseADisposition.findMany({
    where: { statut: "EN_ATTENTE_DECISION" },
    include: {
      magasin: true,
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "asc" },
  });
}
