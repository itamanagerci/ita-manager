import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function PremiereConnexionPage() {
  const utilisateur = await getCurrentUtilisateur();

  if (!utilisateur) redirect("/login");
  if (!utilisateur.premiereConnexion) redirect("/dashboard");

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        Pour des raisons de sécurité, vous devez changer votre code d&apos;accès
        avant de continuer.
      </p>
      <ChangePasswordForm />
    </>
  );
}
