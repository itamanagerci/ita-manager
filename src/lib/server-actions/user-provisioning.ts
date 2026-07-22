import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Initialise les accès d'un utilisateur à partir des modules par défaut de
 * sa Fonction (0.4 du document de cadrage) — appelé à la création du compte.
 */
export async function initialiserAccesDepuisFonction(
  utilisateurId: string,
  fonctionId: string,
): Promise<void> {
  const defauts = await prisma.fonctionModuleDefaut.findMany({
    where: { fonctionId },
  });

  if (defauts.length === 0) return;

  await prisma.accesUtilisateur.createMany({
    data: defauts.map((defaut) => ({
      utilisateurId,
      sousModuleId: defaut.sousModuleId,
      actif: defaut.activeParDefaut,
      estException: false,
    })),
    skipDuplicates: true,
  });
}

/**
 * Propage une évolution des modules par défaut d'une Fonction à tous ses
 * utilisateurs — SAUF ceux qui ont déjà posé une exception individuelle sur
 * ce sous-module précis (règle explicite du 0.4).
 *
 * Doit gérer deux cas : un utilisateur qui a déjà une ligne AccesUtilisateur
 * pour ce sous-module (actif à réaligner) ET un utilisateur qui n'en a
 * encore aucune (le sous-module vient d'être ajouté aux defaults de sa
 * Fonction après sa création — le createMany crée la ligne manquante,
 * skipDuplicates rend l'appel idempotent et ne touche jamais une ligne déjà
 * présente, exception ou non).
 */
export async function propagerModificationFonction(
  fonctionId: string,
  sousModuleId: string,
  nouvelleValeur: boolean,
): Promise<void> {
  const utilisateursDeLaFonction = await prisma.utilisateur.findMany({
    where: { fonctionId },
    select: { id: true },
  });

  if (utilisateursDeLaFonction.length === 0) return;

  await prisma.accesUtilisateur.createMany({
    data: utilisateursDeLaFonction.map((utilisateur) => ({
      utilisateurId: utilisateur.id,
      sousModuleId,
      actif: nouvelleValeur,
      estException: false,
    })),
    skipDuplicates: true,
  });

  await prisma.accesUtilisateur.updateMany({
    where: {
      sousModuleId,
      estException: false,
      utilisateur: { fonctionId },
    },
    data: { actif: nouvelleValeur },
  });
}

/**
 * Change la Fonction d'un utilisateur et réinitialise intégralement ses
 * accès depuis les FonctionModuleDefaut de la nouvelle Fonction —
 * réinitialisation complète (delete + recreate), pas une fusion, y compris
 * les lignes estException:true existantes. L'appelant doit avoir obtenu
 * confirmation de l'administrateur au préalable si des exceptions allaient
 * être perdues (voir gestion-comptes.ts).
 */
export async function changerFonctionUtilisateur(
  utilisateurId: string,
  nouvelleFonctionId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: { fonctionId: nouvelleFonctionId },
    }),
    prisma.accesUtilisateur.deleteMany({ where: { utilisateurId } }),
  ]);

  await initialiserAccesDepuisFonction(utilisateurId, nouvelleFonctionId);
}
