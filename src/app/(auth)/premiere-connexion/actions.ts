"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function changerMotDePassePremiereConnexion(
  motDePasse: string,
): Promise<{ erreur: string } | void> {
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

  redirect("/dashboard");
}
