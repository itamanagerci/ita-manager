import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase navigateur — réservé aux appels `supabase.auth.*`
 * (connexion, changement de mot de passe). Aucune donnée métier (`public.*`)
 * ne doit transiter par ce client : tout passe par Prisma via des
 * Server Components / Server Actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
