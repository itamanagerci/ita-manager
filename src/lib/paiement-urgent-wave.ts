/**
 * ⚠️ SIMULATION UNIQUEMENT — AUCUN APPEL RÉSEAU RÉEL. ⚠️
 *
 * Il n'existe AUCUNE clé API Wave réelle dans ce projet. Cette fonction ne
 * contacte JAMAIS un vrai service Wave — elle ne fait STRICTEMENT AUCUN
 * appel réseau d'aucune sorte (pas de fetch, pas de SDK, rien). Elle logue
 * une ligne explicite de simulation et renvoie un objet de succès factice
 * dont la référence est préfixée "SIMULATION-" pour ne JAMAIS être
 * confondue avec une vraie transaction, y compris des années plus tard en
 * base de données.
 *
 * Délibérément SYNCHRONE (pas de Promise) : une vraie intégration serait
 * nécessairement asynchrone, donc garder cette fonction synchrone rend la
 * différence visible structurellement à chaque site d'appel, pas
 * seulement dans ce commentaire.
 *
 * NE JAMAIS brancher cette fonction sur une passerelle de paiement réelle
 * sans une revue de sécurité complète au préalable (gestion de clé API,
 * webhooks de confirmation, idempotence côté fournisseur, conformité).
 * Tant que ce commentaire est présent, l'intention est que ce circuit
 * reste entièrement simulé. Cf. CLAUDE.md.
 */
export function appellerApiWaveSimulee(
  nomBeneficiaire: string,
  montant: number,
): { referenceSimulee: string } {
  console.log(
    `[SIMULATION] Appel API Wave — API non connectée. Bénéficiaire: ${nomBeneficiaire}, Montant: ${montant} F CFA`,
  );
  return { referenceSimulee: `SIMULATION-${crypto.randomUUID()}` };
}
