"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerRapportHebdoQHSESchema,
  type CreerRapportHebdoQHSEInput,
} from "@/types/validations/qhse";

async function requireAccesRapportHebdo() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "rapport-hebdo");
  return utilisateur;
}

/** Flux 4B — saisie périodique par chantier, pas de circuit de validation. */
export async function creerRapportHebdoQHSE(
  input: CreerRapportHebdoQHSEInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesRapportHebdo();

  const analyse = creerRapportHebdoQHSESchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.rapportHebdoQHSE.create({
    data: {
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      relaisQHSEId: utilisateur.id,
      semaineDu: new Date(donnees.semaineDu),
      semaineAu: new Date(donnees.semaineAu),
      effectifVendredi: donnees.effectifVendredi,
      effectifSamedi: donnees.effectifSamedi,
      effectifLundi: donnees.effectifLundi,
      effectifMardi: donnees.effectifMardi,
      effectifMercredi: donnees.effectifMercredi,
      effectifJeudi: donnees.effectifJeudi,
      activitesQHSE: donnees.activitesQHSE,
      constatsEffectues: donnees.constatsEffectues,
      propositionsRecommandations: donnees.propositionsRecommandations,
      dateSignature: new Date(),
    },
  });

  return { succes: true };
}

export async function listerRapportsHebdoQHSE() {
  await requireAccesRapportHebdo();

  return prisma.rapportHebdoQHSE.findMany({
    include: { relaisQHSE: { select: { nom: true, prenom: true } } },
    orderBy: { dateCreation: "desc" },
  });
}
