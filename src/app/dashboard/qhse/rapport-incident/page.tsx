import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerRapportsIncident } from "@/lib/server-actions/qhse-rapport-incident";
import { listerProjetsPourQHSE } from "@/lib/server-actions/qhse-partage";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RapportIncidentForm } from "@/components/qhse/rapport-incident-form";

const LABEL_TYPE: Record<string, string> = {
  ACCIDENT: "Accident",
  INCIDENT: "Incident",
  PRESQU_ACCIDENT: "Presqu'accident",
};

export default async function RapportIncidentPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "rapport-incident");

  const [rapports, projets] = await Promise.all([listerRapportsIncident(), listerProjetsPourQHSE()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rapport d'Incident / Accident / Presqu'accident"
        description="À déclarer sous 24h. Une non-conformité identifiée déclenche automatiquement une fiche Non-Conformité."
        actions={<RapportIncidentForm projets={projets} />}
      />

      {rapports.length === 0 ? (
        <EmptyState title="Aucun rapport" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reporté par</TableHead>
                  <TableHead>Date événement</TableHead>
                  <TableHead>Non-conformité</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rapports.map((rapport) => {
                  const tonalite: Tonalite = rapport.nonConformite ? "danger" : "succes";
                  return (
                    <TableRow key={rapport.id}>
                      <TableCell className="font-medium">RI-{String(rapport.numero).padStart(5, "0")}</TableCell>
                      <TableCell>{LABEL_TYPE[rapport.typeNotification]}</TableCell>
                      <TableCell>
                        {rapport.reportePar.prenom} {rapport.reportePar.nom}
                      </TableCell>
                      <TableCell>{rapport.dateEvenement.toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <StatutBadge label={rapport.nonConformite ? "Créée" : "Aucune"} tonalite={tonalite} />
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/qhse/rapport-incident/${rapport.id}`}>Voir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
