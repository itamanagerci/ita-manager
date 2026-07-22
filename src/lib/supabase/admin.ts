import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role — accès administrateur complet
 * (création/suppression de comptes Auth, etc.). Strictement serveur, utilisé
 * par les Server Actions de gestion des comptes (lib/server-actions/
 * gestion-comptes.ts) ainsi que par prisma/seed.ts (qui a sa propre copie
 * inline de ce client, car tsx ne peut pas charger `server-only`). Ne
 * JAMAIS importer dans un composant client ni exposer cette clé au
 * navigateur.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
