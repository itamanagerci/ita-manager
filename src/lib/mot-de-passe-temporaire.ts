import { randomInt } from "node:crypto";

// Alphabet sans caractères ambigus à l'écran (0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Génère un mot de passe temporaire lisible, communiqué une seule fois à
 * l'administrateur (jamais stocké en clair côté application — Supabase Auth
 * gère le mot de passe réel). Aucune dépendance externe.
 */
export function genererMotDePasseTemporaire(longueur = 12): string {
  let motDePasse = "";
  for (let i = 0; i < longueur; i++) {
    motDePasse += ALPHABET[randomInt(ALPHABET.length)];
  }
  return motDePasse;
}
