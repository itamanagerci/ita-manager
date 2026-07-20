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
 */
export async function propagerModificationFonction(
  fonctionId: string,
  sousModuleId: string,
  nouvelleValeur: boolean,
): Promise<void> {
  await prisma.accesUtilisateur.updateMany({
    where: {
      sousModuleId,
      estException: false,
      utilisateur: { fonctionId },
    },
    data: { actif: nouvelleValeur },
  });
}
