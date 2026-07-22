import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UtilisateurCourant } from "@/types/auth";
import type { ModuleNav } from "@/types/navigation";

/**
 * Résout l'utilisateur Prisma correspondant à la session Supabase courante.
 * Retourne null si personne n'est connecté (le layout appelant décide de la
 * redirection — ce helper ne redirige jamais lui-même).
 */
export async function getCurrentUtilisateur(): Promise<UtilisateurCourant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { authUserId: user.id },
    include: { fonction: true },
  });

  return utilisateur;
}

/**
 * Modules/sous-modules accessibles à un utilisateur, filtrés sur le droit
 * individuel actif ET le kill-switch produit global (SousModule.actif) ET
 * la visibilité du module dans le menu (Module.visibleMenu) — le module
 * "0. Authentification et Rôles" n'apparaît donc jamais ici.
 */
export async function getModulesAccessibles(
  utilisateurId: string,
): Promise<ModuleNav[]> {
  const acces = await prisma.accesUtilisateur.findMany({
    where: {
      utilisateurId,
      actif: true,
      sousModule: {
        actif: true,
        module: { visibleMenu: true },
      },
    },
    include: {
      sousModule: { include: { module: true } },
    },
    orderBy: [
      { sousModule: { module: { ordre: "asc" } } },
      { sousModule: { ordre: "asc" } },
    ],
  });

  const modulesParId = new Map<string, ModuleNav>();

  for (const { sousModule } of acces) {
    const { module } = sousModule;
    let entry = modulesParId.get(module.id);
    if (!entry) {
      entry = {
        id: module.id,
        code: module.code,
        nom: module.nom,
        icone: module.icone,
        ordre: module.ordre,
        sousModules: [],
      };
      modulesParId.set(module.id, entry);
    }
    entry.sousModules.push({
      id: sousModule.id,
      code: sousModule.code,
      nom: sousModule.nom,
      ordre: sousModule.ordre,
    });
  }

  return Array.from(modulesParId.values()).sort((a, b) => a.ordre - b.ordre);
}

/**
 * Même vérification que requireAccesModule(), sans redirection — pour
 * l'affichage conditionnel d'un lien (ex. dans UserMenu) plutôt que la
 * garde d'une page entière.
 */
export async function peutGererComptes(utilisateurId: string): Promise<boolean> {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      utilisateurId,
      actif: true,
      sousModule: {
        code: "gestion-comptes-acces",
        actif: true,
        module: { code: "authentification-roles" },
      },
    },
  });

  return acces !== null;
}

/**
 * Vérifie l'accès réel de l'utilisateur (ses AccesUtilisateur actifs, pas sa
 * Fonction déclarative) à N'IMPORTE QUEL sous-module actif d'un module donné
 * — généralisation de peutGererComptes() sans filtrer sur un sous-module
 * précis. Utilisée pour des vérifications transversales (ex. accès à la
 * catégorie "RH" de l'archivage documentaire si l'utilisateur a accès au
 * module rh OU direction-generale).
 */
export async function possedeAccesModule(
  utilisateurId: string,
  moduleCode: string,
): Promise<boolean> {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      utilisateurId,
      actif: true,
      sousModule: {
        actif: true,
        module: { code: moduleCode },
      },
    },
  });

  return acces !== null;
}
