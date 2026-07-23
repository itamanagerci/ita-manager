import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirSeanceSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PVSensibilisationForm } from "@/components/qhse/pv-sensibilisation-form";

interface NouveauPVPageProps {
  params: Promise<{ seanceId: string }>;
}

export default async function NouveauPVPage({ params }: NouveauPVPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "pv-sensibilisation");

  const { seanceId } = await params;
  const seance = await obtenirSeanceSensibilisation(seanceId);
  if (!seance) notFound();
  if (seance.pv) redirect(`/dashboard/qhse/pv-sensibilisation/${seance.pv.id}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Procès-Verbal de Sensibilisation — ${seance.theme}`}
        description={`Séance du ${seance.date.toLocaleDateString("fr-FR")}`}
      />

      <Card>
        <CardContent className="pt-6">
          <PVSensibilisationForm
            seanceId={seance.id}
            animateurDefaut={seance.animateur}
            dateDefaut={seance.date.toISOString().slice(0, 10)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
