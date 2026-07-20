import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { PageHeader } from "@/components/ui/composed/page-header";
import { redirect } from "next/navigation";

/**
 * Stub prouvant le pattern de garde RH sans rôle admin technique séparé :
 * cette page est protégée par requireAccesModule() exactement comme le
 * sera n'importe quel module métier futur. Aucune logique de gestion RH
 * n'est implémentée ici (hors périmètre du Lot 0).
 */
export default async function ParametresAccesPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "authentification-roles", "gestion-comptes-acces");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion des comptes et des accès"
        description="Réservé aux fonctions ayant accès au module transversal 0. Authentification et Rôles."
      />
      <p className="text-sm text-muted-foreground">
        Stub de démonstration — la gestion RH (création de compte, attribution
        des accès) sera implémentée dans un lot ultérieur.
      </p>
    </div>
  );
}
