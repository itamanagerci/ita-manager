import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await getCurrentUtilisateur();

  // Un utilisateur déjà connecté et ayant terminé sa première connexion n'a
  // rien à faire sur /login ou /premiere-connexion.
  if (utilisateur && !utilisateur.premiereConnexion) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-foreground">ITA Digital</h1>
        {children}
      </div>
    </div>
  );
}
