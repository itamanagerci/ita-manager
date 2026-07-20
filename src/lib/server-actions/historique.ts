import "server-only";
import { prisma } from "@/lib/prisma";
import type { EnregistrerTransitionInput } from "@/types/historique";
import type { HistoriqueStatut } from "@prisma/client";

/**
 * Journalise une transition de statut pour n'importe quelle entité métier
 * future (Achat, Congés, AST...). Discriminant applicatif (entiteType,
 * entiteId) — aucune FK vers la table métier, qui n'existe pas encore.
 */
export async function enregistrerTransition(
  input: EnregistrerTransitionInput,
): Promise<HistoriqueStatut> {
  return prisma.historiqueStatut.create({
    data: {
      entiteType: input.entiteType,
      entiteId: input.entiteId,
      statutPrecedent: input.statutPrecedent,
      statutNouveau: input.statutNouveau,
      acteurId: input.acteurId,
      commentaire: input.commentaire,
    },
  });
}
