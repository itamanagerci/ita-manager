import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardHomePage() {
  const utilisateur = await getCurrentUtilisateur();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bienvenue, ${utilisateur?.prenom ?? ""}`}
        description="Socle technique ITA Digital — Lot 0"
      />

      <Card>
        <CardHeader>
          <CardTitle>Démonstration — StatutBadge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <StatutBadge label="Neutre" tonalite="neutre" />
          <StatutBadge label="Info" tonalite="info" />
          <StatutBadge label="Attention" tonalite="attention" />
          <StatutBadge label="Validé" tonalite="succes" />
          <StatutBadge label="Refusé" tonalite="danger" />
        </CardContent>
      </Card>
    </div>
  );
}
