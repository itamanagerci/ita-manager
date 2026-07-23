"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";

/**
 * Liste légère (id/nom) partagée par tous les formulaires QHSE ayant un
 * sélecteur chantier/projet (Accueil Sécurité, AST, Attribution EPI,
 * Inspection HSE, Rapport Hebdo, Programme de Sensibilisation, Rapport
 * Incident) — chacun de ces sous-modules est distinct, donc pas de garde
 * unique possible via requireAccesModule() ; simple authentification
 * suffisante, les noms de projet ne sont pas sensibles (même niveau
 * d'exposition que listerProjetsPourDemandeAchat(), Lot 7, mais partagé
 * ici entre plusieurs sous-modules plutôt qu'un seul).
 */
export async function listerProjetsPourQHSE() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.projet.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
}
