import type { RoleValidationAchat } from "@prisma/client";

/**
 * Constante extraite dans un module à part (pas "use server") — un fichier
 * "use server" ne peut exporter que des fonctions async, même règle que
 * storage-constants.ts (Lot 2).
 */
export const LABEL_ROLE: Record<RoleValidationAchat, string> = {
  DT: "Direction Technique",
  RH: "Ressources Humaines",
  DFC: "Finances et Comptabilité (DFC)",
  DG: "Direction Générale",
};
