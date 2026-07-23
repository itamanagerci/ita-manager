"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  mettreAJourNumeroWaveFournisseurSchema,
  type MettreAJourNumeroWaveFournisseurInput,
} from "@/types/validations/dfc";

async function requireAccesPaiementStandard() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "dfc", "paiement-standard");
  return utilisateur;
}

/**
 * Liste des Fournisseur référencés — la plupart auto-créés en toile de
 * fond par trouverOuCreerBonDeCommandeOuvert() (achat-bons-commande.ts),
 * jamais saisis directement. Cette page est le seul endroit où leur
 * numeroWave est éditable, préalable requis avant tout paiement mobile
 * money. Cf. CLAUDE.md.
 */
export async function listerFournisseurs() {
  await requireAccesPaiementStandard();
  return prisma.fournisseur.findMany({ orderBy: { nom: "asc" } });
}

export async function mettreAJourNumeroWaveFournisseur(
  input: MettreAJourNumeroWaveFournisseurInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesPaiementStandard();

  const analyse = mettreAJourNumeroWaveFournisseurSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.fournisseur.update({
    where: { id: donnees.fournisseurId },
    data: { numeroWave: donnees.numeroWave },
  });

  return { succes: true };
}
