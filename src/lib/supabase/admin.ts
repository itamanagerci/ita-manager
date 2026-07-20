import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role — accès administrateur complet
 * (création de comptes Auth, etc.). Strictement serveur, utilisé uniquement
 * par le script de seed dans ce lot. Ne JAMAIS importer dans un composant
 * client ni exposer cette clé au navigateur.
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
