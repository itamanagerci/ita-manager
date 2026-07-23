"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerBonSortieTransfertSchema, type CreerBonSortieTransfertInput } from "@/types/validations/vehicules";

async function requireAccesBonSortie() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "bon-sortie");
  return utilisateur;
}

async function peutEtreResponsableSortie(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

export async function creerBonSortieTransfert(
  input: CreerBonSortieTransfertInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesBonSortie();

  const analyse = creerBonSortieTransfertSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.bonSortieTransfert.create({
    data: {
      lieuSortie: donnees.lieuSortie,
      motif: donnees.motif,
      destination: donnees.destination,
      receptionnaireNom: donnees.receptionnaireNom,
      receptionnaireContact: donnees.receptionnaireContact,
      cia: donnees.cia || null,
      demandeTransportId: donnees.demandeTransportId || null,
      demandeurId: utilisateur.id,
      lignes: {
        create: donnees.lignes.map((ligne) => ({
          materielId: ligne.materielId,
          quantite: ligne.quantite,
          etat: ligne.etat || null,
          observation: ligne.observation || null,
        })),
      },
    },
  });

  return { succes: true };
}

export async function viserExpediteur(bonId: string): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesBonSortie();

  const bon = await prisma.bonSortieTransfert.findUnique({ where: { id: bonId } });
  if (!bon) return { erreur: "Bon introuvable." };
  if (bon.statut !== "CREE") return { erreur: "Ce bon a déjà été traité." };

  await prisma.bonSortieTransfert.update({
    where: { id: bonId },
    data: {
      statut: "ARTICLES_RENSEIGNES",
      expediteurConvoyeurId: utilisateur.id,
      dateVisaExpediteur: new Date(),
    },
  });

  return { succes: true };
}

/**
 * Cette signature déclenche le décrément de stock — même pattern atomique
 * interactive que flux-sortie (Livraison A), même ledger MouvementStock
 * partagé quelle que soit la voie empruntée pour sortir un article. Cf.
 * CLAUDE.md.
 */
export async function viserResponsableSortie(bonId: string): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutEtreResponsableSortie(utilisateur.id))) redirect("/dashboard");

  const bon = await prisma.bonSortieTransfert.findUnique({
    where: { id: bonId },
    include: { lignes: true },
  });
  if (!bon) return { erreur: "Bon introuvable." };
  if (bon.statut !== "ARTICLES_RENSEIGNES") {
    return { erreur: "Ce bon doit d'abord être visé par l'Expéditeur-Convoyeur." };
  }

  const resultat = await prisma.$transaction(async (tx) => {
    for (const ligne of bon.lignes) {
      const decrement = await tx.materiel.updateMany({
        where: { id: ligne.materielId, quantiteStock: { gte: ligne.quantite } },
        data: { quantiteStock: { decrement: ligne.quantite } },
      });
      if (decrement.count === 0) return null;

      const materiel = await tx.materiel.findUniqueOrThrow({ where: { id: ligne.materielId } });
      await tx.mouvementStock.create({
        data: {
          materielId: ligne.materielId,
          type: "SORTIE",
          quantite: ligne.quantite,
          quantiteApresMouvement: materiel.quantiteStock ?? 0,
          motif: bon.motif,
          effectueParId: utilisateur.id,
        },
      });
    }

    return tx.bonSortieTransfert.update({
      where: { id: bonId },
      data: { statut: "SIGNE", responsableSortieId: utilisateur.id, dateVisaResponsableSortie: new Date() },
    });
  });

  if (!resultat) {
    return { erreur: "Stock insuffisant sur au moins un article au moment de la signature." };
  }

  return { succes: true };
}

export async function listerBonsSortieTransfert() {
  await requireAccesBonSortie();

  return prisma.bonSortieTransfert.findMany({
    include: {
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "desc" },
  });
}
