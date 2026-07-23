"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  mettreAJourSeuilUrgenceSchema,
  type MettreAJourSeuilUrgenceInput,
} from "@/types/validations/achat";

/**
 * findFirst() ?? create() défensif — le seed crée toujours une ligne, mais
 * ce garde-fou évite une erreur si ParametresAchat est vide pour une raison
 * quelconque (même philosophie que le reste du référentiel "table plutôt
 * qu'enum").
 */
export async function obtenirParametresAchat() {
  const existant = await prisma.parametresAchat.findFirst();
  if (existant) return existant;
  return prisma.parametresAchat.create({ data: { seuilUrgence: 500_000 } });
}

export async function mettreAJourSeuilUrgence(
  input: MettreAJourSeuilUrgenceInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");

  const analyse = mettreAJourSeuilUrgenceSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };

  const parametres = await obtenirParametresAchat();
  await prisma.parametresAchat.update({
    where: { id: parametres.id },
    data: { seuilUrgence: analyse.data.seuilUrgence, modifieParId: utilisateur.id },
  });

  return { succes: true };
}
