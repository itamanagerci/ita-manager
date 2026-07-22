"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Ne redirige pas elle-même (contrairement à une version précédente) : la
 * redirection est laissée au client, après le succès, pour laisser une
 * fenêtre où afficher un toast — un redirect() côté serveur ne rend jamais
 * la main au composant client appelant. Même pattern que login-form.tsx.
 */
export async function changerMotDePassePremiereConnexion(
  motDePasse: string,
): Promise<{ erreur: string } | { succes: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: "Session expirée, veuillez vous reconnecter." };
  }

  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) {
    return { erreur: "Impossible de mettre à jour le mot de passe." };
  }

  await prisma.utilisateur.update({
    where: { authUserId: user.id },
    data: { premiereConnexion: false },
  });

  return { succes: true };
}
