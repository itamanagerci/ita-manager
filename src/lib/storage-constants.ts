/**
 * Constantes du bucket Storage privé "documents" (Lot 2) — extraites dans
 * un module à part (pas "use server") car un fichier "use server" ne peut
 * exporter que des fonctions async ; ces constantes doivent rester
 * réutilisables telles quelles par documents.ts ET appel-offres.ts (Lot 5).
 */
export const BUCKET = "documents";
export const TAILLE_MAX_OCTETS = 20 * 1024 * 1024; // 20 Mo
export const MIME_TYPES_AUTORISES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
