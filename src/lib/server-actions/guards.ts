import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import type { UtilisateurCourant } from "@/types/auth";

/** Redirige vers /login si personne n'est connecté. Retourne l'utilisateur sinon. */
export async function requireAuthentification(): Promise<UtilisateurCourant> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return utilisateur;
}

/** Déconnecte et redirige si le compte a été désactivé par la RH. */
export async function requireCompteActif(
  utilisateur: UtilisateurCourant,
): Promise<void> {
  if (utilisateur.statut === "INACTIF") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?erreur=compte-desactive");
  }
}

/**
 * Vérifie qu'un utilisateur a le droit d'accéder à un sous-module précis.
 * Réutilisé tel quel pour protéger la future page de gestion RH (module
 * "authentification-roles") — pas de rôle admin technique séparé, conforme
 * au principe "un seul point de gestion" du document de cadrage.
 */
export async function requireAccesModule(
  utilisateurId: string,
  moduleCode: string,
  sousModuleCode: string,
): Promise<void> {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      utilisateurId,
      actif: true,
      sousModule: {
        code: sousModuleCode,
        actif: true,
        module: { code: moduleCode },
      },
    },
  });

  if (!acces) redirect("/dashboard");
}
