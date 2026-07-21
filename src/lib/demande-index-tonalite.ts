import type { Tonalite } from "@/components/ui/composed/statut-badge";

const MOTS_CLES_SUCCES = ["valid", "approuv", "accept"];
const MOTS_CLES_ATTENTION = ["attente"];
const MOTS_CLES_DANGER = ["refus", "rejet", "annul"];

/**
 * Heuristique par mots-clés sur statutLibelle (chaîne libre propre à chaque
 * module — DemandeIndex n'a volontairement pas de champ d'issue structuré).
 * Sert à colorer StatutBadge et à approximer "montant validé" en KPI.
 * À revisiter si un futur module a un statutLibelle qui ne matche aucun
 * mot-clé (repli sur "neutre", jamais une exception).
 */
export function tonaliteDepuisStatutLibelle(statutLibelle: string): Tonalite {
  const valeur = statutLibelle.toLowerCase();
  if (MOTS_CLES_DANGER.some((mot) => valeur.includes(mot))) return "danger";
  if (MOTS_CLES_SUCCES.some((mot) => valeur.includes(mot))) return "succes";
  if (MOTS_CLES_ATTENTION.some((mot) => valeur.includes(mot))) return "attention";
  return "neutre";
}
