"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerArticleSchema, type CreerArticleInput } from "@/types/validations/direction-technique";

async function requireAccesListeArticles() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "direction-technique", "liste-articles");
  return utilisateur;
}

export async function creerArticle(
  input: CreerArticleInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesListeArticles();

  const analyse = creerArticleSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };

  await prisma.article.create({
    data: { designation: analyse.data.designation, creeParId: utilisateur.id },
  });

  return { succes: true };
}

export async function listerArticles() {
  await requireAccesListeArticles();

  return prisma.article.findMany({ orderBy: { designation: "asc" } });
}
