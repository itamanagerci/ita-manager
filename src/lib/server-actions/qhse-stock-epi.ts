"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerAttributionEPISchema, type CreerAttributionEPIInput } from "@/types/validations/qhse";

async function requireAccesStockEPI() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "stock-epi");
  return utilisateur;
}

/**
 * Flux 3 — lecture filtrée sur Materiel (catégorie EPI), pas de nouveau
 * modèle de stock (Lot 6 déjà construit) ; gatée par
 * requireAccesModule("qhse","stock-epi") seul, indépendamment de tout accès
 * Logistique. Cf. CLAUDE.md.
 */
export async function listerMaterielsEPI() {
  await requireAccesStockEPI();

  return prisma.materiel.findMany({
    where: { categorie: { code: "EPI" } },
    include: { categorie: true, uniteMesure: true, magasin: true },
    orderBy: { designation: "asc" },
  });
}

/**
 * Flux 3 — sortie nominative d'EPI (la fiche papier réelle est nominative).
 * Décrémente Materiel/crée un MouvementStock SORTIE via le même pattern
 * atomique que flux-sortie.ts (updateMany conditionnel, count===0 →
 * refus) — inline ici, pas une fonction partagée, même choix que
 * deciderDMS() qui duplique ce bloc pour chacune de ses branches. Cf.
 * CLAUDE.md.
 */
export async function creerAttributionEPI(
  input: CreerAttributionEPIInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesStockEPI();

  const analyse = creerAttributionEPISchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const resultat = await prisma.$transaction(async (tx) => {
    const decrement = await tx.materiel.updateMany({
      where: { id: donnees.materielId, quantiteStock: { gte: donnees.quantiteSortie } },
      data: { quantiteStock: { decrement: donnees.quantiteSortie } },
    });
    if (decrement.count === 0) return null;

    const materiel = await tx.materiel.findUniqueOrThrow({ where: { id: donnees.materielId } });
    const mouvement = await tx.mouvementStock.create({
      data: {
        materielId: donnees.materielId,
        type: "SORTIE",
        quantite: donnees.quantiteSortie,
        quantiteApresMouvement: materiel.quantiteStock ?? 0,
        motif: "Attribution EPI",
        effectueParId: utilisateur.id,
      },
    });

    return tx.attributionEPI.create({
      data: {
        date: new Date(),
        projetId: donnees.projetId || null,
        chantierLibre: donnees.chantierLibre || null,
        lieu: donnees.lieu || null,
        beneficiaireId: donnees.beneficiaireId,
        materielId: donnees.materielId,
        quantiteSortie: donnees.quantiteSortie,
        retourEpiUsage: donnees.retourEpiUsage,
        effectueParId: utilisateur.id,
        mouvementStockId: mouvement.id,
      },
    });
  });

  if (!resultat) {
    return { erreur: "Stock insuffisant pour cette sortie d'EPI." };
  }

  return { succes: true };
}

export async function listerAttributionsEPI() {
  await requireAccesStockEPI();

  return prisma.attributionEPI.findMany({
    include: {
      beneficiaire: { select: { nom: true, prenom: true } },
      materiel: { select: { designation: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

/** Liste légère pour le sélecteur de bénéficiaire du formulaire. */
export async function listerBeneficiairesEPI() {
  await requireAccesStockEPI();
  return prisma.utilisateur.findMany({
    where: { statut: "ACTIF" },
    select: { id: true, nom: true, prenom: true },
    orderBy: { nom: "asc" },
  });
}
