"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { profilRHSchema, type ProfilRHInput } from "@/types/validations/rh";

async function requireAccesCreationProfil() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "rh", "creation-profil");
  return utilisateur;
}

export async function mettreAJourProfilRH(
  utilisateurId: string,
  input: ProfilRHInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesCreationProfil();

  const analyse = profilRHSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const superieurId = donnees.superieurId && donnees.superieurId.length > 0 ? donnees.superieurId : null;
  if (superieurId === utilisateurId) {
    return { erreur: "Un utilisateur ne peut pas être son propre supérieur." };
  }

  await prisma.$transaction([
    prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: { superieurId, numeroWave: donnees.numeroWave || null },
    }),
    prisma.profilEmploye.upsert({
      where: { utilisateurId },
      update: {
        typeProfil: donnees.typeProfil,
        poste: donnees.poste,
        service: donnees.service,
        dateEntree: new Date(donnees.dateEntree),
        soldeConges: donnees.soldeConges,
        salaireFixe: donnees.salaireFixe ?? null,
        entrepriseRattachee: donnees.entrepriseRattachee ?? null,
        tauxJournalier: donnees.tauxJournalier ?? null,
      },
      create: {
        utilisateurId,
        typeProfil: donnees.typeProfil,
        poste: donnees.poste,
        service: donnees.service,
        dateEntree: new Date(donnees.dateEntree),
        soldeConges: donnees.soldeConges,
        salaireFixe: donnees.salaireFixe ?? null,
        entrepriseRattachee: donnees.entrepriseRattachee ?? null,
        tauxJournalier: donnees.tauxJournalier ?? null,
      },
    }),
  ]);

  return { succes: true };
}

export async function listerProfils() {
  await requireAccesCreationProfil();

  return prisma.utilisateur.findMany({
    include: { profilEmploye: true },
    orderBy: { nom: "asc" },
  });
}
