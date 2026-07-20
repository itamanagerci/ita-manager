import { toast } from "sonner";

/**
 * Point d'entrée générique pour les notifications toast, enveloppant sonner.
 * Tout futur module métier appellera ce hook plutôt que `toast` directement,
 * pour garder un seul endroit à faire évoluer (ex: ajout de tracking).
 */
export function useNotifier() {
  return {
    succes: (titre: string, description?: string) => toast.success(titre, { description }),
    erreur: (titre: string, description?: string) => toast.error(titre, { description }),
    info: (titre: string, description?: string) => toast.info(titre, { description }),
  };
}
