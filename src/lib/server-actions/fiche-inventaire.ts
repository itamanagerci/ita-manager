"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerMaterielSchema,
  modifierMaterielSchema,
  type CreerMaterielInput,
  type ModifierMaterielInput,
} from "@/types/validations/logistique";

async function requireAccesFicheInventaire() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "fiche-inventaire");
  return utilisateur;
}

export async function listerCategoriesMateriel() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.categorieMateriel.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
}

export async function listerUnitesMesure() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.uniteMesure.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
}

export async function listerMagasins() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.magasin.findMany({ orderBy: { code: "asc" } });
}

export async function creerMateriel(
  input: CreerMaterielInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesFicheInventaire();

  const analyse = creerMaterielSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  if (donnees.reference) {
    const existant = await prisma.materiel.findUnique({ where: { reference: donnees.reference } });
    if (existant) return { erreur: "Cette référence est déjà utilisée." };
  }

  await prisma.materiel.create({
    data: {
      reference: donnees.reference || null,
      designation: donnees.designation,
      categorieId: donnees.categorieId,
      uniteMesureId: donnees.uniteMesureId,
      magasinId: donnees.magasinId,
      emplacement: donnees.emplacement || null,
      fournisseurHabituel: donnees.fournisseurHabituel || null,
      quantiteStock: donnees.quantiteStock,
      dateCreationStock: new Date(),
      seuilAlerte: donnees.seuilAlerte ?? null,
      stockSecurite: donnees.stockSecurite ?? null,
      quantiteReapproStandard: donnees.quantiteReapproStandard ?? null,
      delaiFournisseurMoyenJours: donnees.delaiFournisseurMoyenJours ?? null,
      disponible: true,
    },
  });

  return { succes: true };
}

/** Ne modifie jamais quantiteStock — uniquement les mouvements le font (cf. CLAUDE.md). */
export async function modifierMateriel(
  input: ModifierMaterielInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesFicheInventaire();

  const analyse = modifierMaterielSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.materiel.update({
    where: { id: donnees.id },
    data: {
      reference: donnees.reference || null,
      designation: donnees.designation,
      categorieId: donnees.categorieId,
      uniteMesureId: donnees.uniteMesureId,
      magasinId: donnees.magasinId,
      emplacement: donnees.emplacement || null,
      fournisseurHabituel: donnees.fournisseurHabituel || null,
      seuilAlerte: donnees.seuilAlerte ?? null,
      stockSecurite: donnees.stockSecurite ?? null,
      quantiteReapproStandard: donnees.quantiteReapproStandard ?? null,
      delaiFournisseurMoyenJours: donnees.delaiFournisseurMoyenJours ?? null,
      disponible: donnees.disponible,
    },
  });

  return { succes: true };
}

/**
 * Colonnes TSG-INV (tableau de suivi général des stocks) calculées à la
 * lecture, pas persistées : statut OK/ALERTE (quantiteStock <= seuilAlerte)
 * et présence d'une demande d'achat en cours. Cf. CLAUDE.md.
 */
export async function listerMaterielsInventaire() {
  await requireAccesFicheInventaire();

  const materiels = await prisma.materiel.findMany({
    where: { magasinId: { not: null } },
    include: {
      categorie: true,
      uniteMesure: true,
      magasin: true,
      demandesReapprovisionnement: { where: { statut: "EN_ATTENTE_ACHAT" }, select: { id: true } },
    },
    orderBy: { designation: "asc" },
  });

  return materiels.map((materiel) => ({
    ...materiel,
    statutStock:
      materiel.quantiteStock !== null &&
      materiel.seuilAlerte !== null &&
      materiel.quantiteStock <= materiel.seuilAlerte
        ? ("ALERTE" as const)
        : ("OK" as const),
    demandeAchatEnCours: materiel.demandesReapprovisionnement.length > 0,
  }));
}
