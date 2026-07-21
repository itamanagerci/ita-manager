import "server-only";
import { prisma } from "@/lib/prisma";
import type { UpsertDemandeIndexInput } from "@/types/demande-index";
import type { DemandeIndex, Module } from "@prisma/client";

/**
 * Écrit/actualise la projection DG d'une demande métier (upsert sur
 * entiteType+entiteId). Écrase toujours enAttenteValidationDe et
 * enAttenteValidationUtilisateurId avec la valeur fournie (null par défaut
 * si omis) — jamais de fusion partielle, pour qu'un ancien validateur ne
 * reste jamais affiché "en attente" après une transition. Ne remplace pas
 * enregistrerTransition() : les deux sont appelés ensemble par les futurs
 * modules à chaque changement de statut.
 */
export async function upsertDemandeIndex(
  input: UpsertDemandeIndexInput,
): Promise<DemandeIndex> {
  const donneesCommunes = {
    typeModule: input.typeModule,
    sousModule: input.sousModule,
    reference: input.reference ?? null,
    demandeurId: input.demandeurId,
    statutLibelle: input.statutLibelle,
    montant: input.montant ?? null,
    enAttenteValidationDe: input.enAttenteValidationDe ?? null,
    enAttenteValidationUtilisateurId: input.enAttenteValidationUtilisateurId ?? null,
    lienDetail: input.lienDetail ?? null,
  };

  return prisma.demandeIndex.upsert({
    where: { entiteType_entiteId: { entiteType: input.entiteType, entiteId: input.entiteId } },
    create: {
      ...donneesCommunes,
      entiteType: input.entiteType,
      entiteId: input.entiteId,
      dateSoumission: input.dateSoumission,
    },
    update: donneesCommunes,
  });
}

/** Modules métier candidats à l'agrégation DG (tout sauf le module DG lui-même). */
export async function getModulesMetier(): Promise<Pick<Module, "code" | "nom" | "ordre">[]> {
  return prisma.module.findMany({
    where: { code: { not: "direction-generale" }, visibleMenu: true },
    orderBy: { ordre: "asc" },
    select: { code: true, nom: true, ordre: true },
  });
}
