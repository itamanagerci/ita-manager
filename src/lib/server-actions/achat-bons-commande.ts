"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";

/**
 * Gate partagée par toutes les actions BC — pas de sous-module "bons-
 * commande" dédié dans le référentiel : l'émission/l'envoi d'un Bon de
 * Commande fait partie du travail du Responsable Achat, gaté par le même
 * sous-module que le traitement des demandes (traitement-achat). Cf.
 * CLAUDE.md.
 */
async function requireAccesBonsDeCommande() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");
  return utilisateur;
}

/**
 * "Un BC ouvert par fournisseur à la fois" — find-or-create idempotent,
 * même forme que creerOuReutiliserDemandeReapprovisionnement() (Lot 6).
 * Cf. CLAUDE.md pour la mécanique ouvertMarqueur (NULL toujours distinct
 * dans @@unique([fournisseur, ouvertMarqueur])).
 *
 * Lot 8 (DFC) : lie aussi, en toile de fond, ce BC à un Fournisseur
 * référencé (find-or-create par nom exact) — purement additif, jamais lu
 * ni modifié le groupement ci-dessus qui reste basé sur la chaîne libre
 * `fournisseur`. Aucun changement de comportement pour le Responsable
 * Achat : il continue de taper un nom libre, inchangé. Cf. CLAUDE.md.
 */
export async function trouverOuCreerBonDeCommandeOuvert(fournisseur: string) {
  const existant = await prisma.bonDeCommande.findFirst({
    where: { fournisseur, ouvertMarqueur: true },
  });

  const fournisseurRef = await prisma.fournisseur.upsert({
    where: { nom: fournisseur },
    update: {},
    create: { nom: fournisseur },
  });

  if (existant) {
    if (!existant.fournisseurId) {
      return prisma.bonDeCommande.update({
        where: { id: existant.id },
        data: { fournisseurId: fournisseurRef.id },
      });
    }
    return existant;
  }

  return prisma.bonDeCommande.create({
    data: { fournisseur, ouvertMarqueur: true, fournisseurId: fournisseurRef.id },
  });
}

/**
 * Émet les lignes d'une DemandeAchat (urgente ou parallèle complète) vers
 * un/plusieurs BonDeCommande, groupés par fournisseur — chaque ligne porte
 * le sien (renseigné à l'étape 3), jamais un BC unique par demande. Le prix
 * unitaire du BC est dérivé de montantLigneHT/quantité (fonctionne aussi
 * bien en mode forfaitaire que calculé, tous deux déjà résolus en HT à
 * l'étape 3). Cf. CLAUDE.md.
 */
export async function emettreLignesBonDeCommande(demandeId: string): Promise<void> {
  const demande = await prisma.demandeAchat.findUniqueOrThrow({
    where: { id: demandeId },
    include: { lignes: true },
  });

  const tauxTva = demande.tauxTva ? Number(demande.tauxTva) : 0;

  for (const ligne of demande.lignes) {
    if (!ligne.fournisseur || ligne.montantLigneHT == null) continue;

    const bc = await trouverOuCreerBonDeCommandeOuvert(ligne.fournisseur);
    const montantLigneHT = Number(ligne.montantLigneHT);
    const prixUnitaire = montantLigneHT / ligne.quantite;
    const montantLigneTTC = montantLigneHT * (1 + tauxTva / 100);

    await prisma.ligneBonDeCommande.create({
      data: {
        bonDeCommandeId: bc.id,
        ligneDemandeAchatId: ligne.id,
        quantite: ligne.quantite,
        prixUnitaire,
        montantLigneTTC,
      },
    });
  }
}

export async function marquerBonDeCommandeEnvoye(
  bonDeCommandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesBonsDeCommande();

  const bc = await prisma.bonDeCommande.findUnique({ where: { id: bonDeCommandeId } });
  if (!bc) return { erreur: "Bon de Commande introuvable." };
  if (bc.statut !== "OUVERT") return { erreur: "Ce Bon de Commande n'est plus ouvert." };

  await prisma.bonDeCommande.update({
    where: { id: bonDeCommandeId },
    data: {
      statut: "ENVOYE",
      ouvertMarqueur: null,
      envoyeParId: utilisateur.id,
      dateEnvoi: new Date(),
    },
  });

  return { succes: true };
}

export async function listerBonsDeCommande() {
  await requireAccesBonsDeCommande();
  return prisma.bonDeCommande.findMany({
    include: {
      lignes: {
        include: {
          ligneDemandeAchat: {
            include: {
              article: { select: { designation: true } },
              demande: { select: { numero: true } },
            },
          },
        },
      },
    },
    orderBy: { dateCreation: "desc" },
  });
}

/**
 * Liste légère pour le sélecteur optionnel du formulaire BEM (Lot 6,
 * flux-entree) — gatée par logistique/flux-entree, pas traitement-achat :
 * c'est le Chef Magasin qui enregistre la livraison et choisit, s'il y a
 * lieu, à quel BC elle correspond. Seuls les BC "Envoyé" sont proposés — un
 * BC encore "Ouvert" n'a pas encore été transmis au fournisseur. Cf.
 * CLAUDE.md.
 */
export async function listerBonsDeCommandePourReception() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "flux-entree");

  return prisma.bonDeCommande.findMany({
    where: { statut: "ENVOYE" },
    select: { id: true, numero: true, fournisseur: true },
    orderBy: { dateEnvoi: "desc" },
  });
}

/**
 * Lot 8 (DFC) : BC facturables/payables — statut ENVOYE, aucune Facture
 * encore enregistrée, et au moins une réception CONFIRMÉE (BonEntreeMagasin
 * statut=VALIDE, pas seulement "reçu" — c'est la validation par le
 * Logisticien, pas la création par le Chef Magasin, qui atteste
 * réellement la livraison). Cf. CLAUDE.md.
 */
export async function listerBonsDeCommandePayables() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "dfc", "paiement-standard");

  return prisma.bonDeCommande.findMany({
    where: {
      statut: "ENVOYE",
      facture: null,
      bonsEntreeMagasin: { some: { statut: "VALIDE" } },
    },
    include: {
      fournisseurRef: true,
      bonsEntreeMagasin: { where: { statut: "VALIDE" } },
      lignes: {
        include: {
          ligneDemandeAchat: {
            include: { article: { select: { designation: true } }, demande: true },
          },
        },
      },
    },
    orderBy: { dateEnvoi: "asc" },
  });
}

export async function obtenirBonDeCommandeDetail(id: string) {
  await requireAccesBonsDeCommande();
  return prisma.bonDeCommande.findUnique({
    where: { id },
    include: {
      lignes: {
        include: {
          ligneDemandeAchat: {
            include: { article: { select: { designation: true } }, demande: true },
          },
        },
      },
      bonsEntreeMagasin: true,
    },
  });
}
