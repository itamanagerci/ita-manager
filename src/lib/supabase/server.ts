import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase serveur — utilisé dans les Server Components / Server
 * Actions pour `supabase.auth.*` uniquement. Toujours utiliser `getUser()`
 * (revalide le JWT auprès du serveur Auth) et jamais `getSession()` (fait
 * confiance au cookie sans validation).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : ignoré si un middleware
            // rafraîchit déjà les sessions utilisateur.
          }
        },
      },
    },
  );
}
