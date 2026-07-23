"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  enregistrerFactureSchema,
  executerPaiementFactureSchema,
  executerPaiementMissionSchema,
  type EnregistrerFactureInput,
  type ExecuterPaiementFactureInput,
  type ExecuterPaiementMissionInput,
} from "@/types/validations/dfc";

async function requireAccesPaiementStandard() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "dfc", "paiement-standard");
  return utilisateur;
}

export async function enregistrerFacture(
  input: EnregistrerFactureInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPaiementStandard();

  const analyse = enregistrerFactureSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  // Ré-vérifie l'éligibilité côté serveur — jamais confiance à la liste
  // affichée côté client (même principe que partout ailleurs dans ce
  // projet).
  const bc = await prisma.bonDeCommande.findUnique({
    where: { id: donnees.bonDeCommandeId },
    include: { bonsEntreeMagasin: true, facture: true },
  });
  if (!bc) return { erreur: "Bon de Commande introuvable." };
  if (bc.statut !== "ENVOYE") return { erreur: "Ce Bon de Commande n'est pas encore envoyé." };
  if (bc.facture) return { erreur: "Une facture est déjà enregistrée pour ce Bon de Commande." };
  if (!bc.bonsEntreeMagasin.some((bem) => bem.statut === "VALIDE")) {
    return {
      erreur: "Aucune réception confirmée par le Logisticien pour ce Bon de Commande — impossible d'enregistrer la facture.",
    };
  }

  const facture = await prisma.facture.create({
    data: {
      bonDeCommandeId: donnees.bonDeCommandeId,
      referenceFournisseur: donnees.referenceFournisseur,
      montant: donnees.montant,
      dateFacture: new Date(donnees.dateFacture),
      enregistreParId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "Facture",
    entiteId: facture.id,
    statutNouveau: "ENREGISTREE",
    acteurId: utilisateur.id,
  });

  return { succes: true };
}

export async function executerPaiementFacture(
  input: ExecuterPaiementFactureInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPaiementStandard();

  const analyse = executerPaiementFactureSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const facture = await prisma.facture.findUnique({
    where: { id: donnees.factureId },
    include: {
      paiement: true,
      bonDeCommande: {
        include: {
          fournisseurRef: true,
          lignes: { include: { ligneDemandeAchat: { include: { demande: true } } } },
        },
      },
    },
  });
  if (!facture) return { erreur: "Facture introuvable." };
  if (facture.paiement) return { erreur: "Cette facture a déjà été payée." };

  if (donnees.mode === "MOBILE_MONEY" && !facture.bonDeCommande.fournisseurRef?.numeroWave) {
    return {
      erreur:
        "Numéro Wave requis pour ce fournisseur — renseignez-le avant de payer en mobile money.",
    };
  }

  const paiement = await prisma.paiement.create({
    data: {
      factureId: facture.id,
      montant: facture.montant,
      mode: donnees.mode,
      reference: donnees.reference || null,
      executeParId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "Paiement",
    entiteId: paiement.id,
    statutNouveau: "EXECUTE",
    acteurId: utilisateur.id,
  });

  // Un BC peut agréger des lignes de PLUSIEURS DemandeAchat (groupement par
  // fournisseur, Lot 7) — ré-upsert la ligne DemandeIndex de CHACUNE
  // d'elles (entiteType/entiteId inchangés, la demande reste "traitée",
  // les deux champs de validation restent null), pas une seule. Contient
  // "valid" -> tonaliteDepuisStatutLibelle() la classe "succes".
  const demandesUniques = Array.from(
    new Map(
      facture.bonDeCommande.lignes.map((ligne) => [
        ligne.ligneDemandeAchat.demande.id,
        ligne.ligneDemandeAchat.demande,
      ]),
    ).values(),
  );
  for (const demande of demandesUniques) {
    await upsertDemandeIndex({
      typeModule: "achat",
      sousModule: "demande-achat",
      reference: `ACH-${String(demande.numero).padStart(5, "0")}`,
      entiteType: "DemandeAchat",
      entiteId: demande.id,
      demandeurId: demande.demandeurId,
      statutLibelle: "Validée — Bon de Commande payé",
      montant: demande.montantTotalTTC,
      enAttenteValidationDe: null,
      enAttenteValidationUtilisateurId: null,
      lienDetail: "/dashboard/achat/demande-achat",
      dateSoumission: demande.dateCreation,
    });
  }

  return { succes: true };
}

/**
 * Factures enregistrées mais pas encore payées — étape intermédiaire entre
 * listerBonsDeCommandePayables() (BC pas encore facturé) et
 * listerPaiementsEffectues() (paiement exécuté). Cf. CLAUDE.md.
 */
export async function listerFacturesAPayer() {
  await requireAccesPaiementStandard();

  return prisma.facture.findMany({
    where: { paiement: null },
    include: {
      bonDeCommande: {
        include: {
          fournisseurRef: true,
          lignes: { include: { ligneDemandeAchat: { include: { demande: true } } } },
        },
      },
    },
    orderBy: { dateEnregistrement: "asc" },
  });
}

export async function listerMissionsPayables() {
  await requireAccesPaiementStandard();

  return prisma.demandeMission.findMany({
    where: { statut: "VALIDEE_RH", fraisDeclares: { not: null }, paiement: null },
    include: { employeConcerne: { select: { nom: true, prenom: true, numeroWave: true } } },
    orderBy: { dateCreation: "asc" },
  });
}

export async function executerPaiementMission(
  input: ExecuterPaiementMissionInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPaiementStandard();

  const analyse = executerPaiementMissionSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeMission.findUnique({
    where: { id: donnees.demandeMissionId },
    include: { employeConcerne: true, paiement: true },
  });
  if (!demande) return { erreur: "Mission introuvable." };
  if (demande.statut !== "VALIDEE_RH" || demande.fraisDeclares == null) {
    return { erreur: "Cette mission n'a pas de frais validés à payer." };
  }
  if (demande.paiement) return { erreur: "Cette mission a déjà été payée." };

  if (donnees.mode === "MOBILE_MONEY" && !demande.employeConcerne.numeroWave) {
    return {
      erreur:
        "Numéro Wave requis pour ce bénéficiaire — renseignez-le sur son profil RH avant de payer en mobile money.",
    };
  }

  const paiement = await prisma.paiement.create({
    data: {
      demandeMissionId: demande.id,
      montant: demande.fraisDeclares,
      mode: donnees.mode,
      reference: donnees.reference || null,
      executeParId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "Paiement",
    entiteId: paiement.id,
    statutNouveau: "EXECUTE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: "rh",
    sousModule: "mission",
    reference: null,
    entiteType: "DemandeMission",
    entiteId: demande.id,
    demandeurId: demande.employeConcerneId,
    statutLibelle: "Paiement validé",
    montant: demande.fraisDeclares,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: "/dashboard/rh/mission",
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerPaiementsEffectues() {
  await requireAccesPaiementStandard();

  return prisma.paiement.findMany({
    include: {
      facture: { include: { bonDeCommande: true } },
      demandeMission: { include: { employeConcerne: { select: { nom: true, prenom: true } } } },
    },
    orderBy: { dateExecution: "desc" },
  });
}
