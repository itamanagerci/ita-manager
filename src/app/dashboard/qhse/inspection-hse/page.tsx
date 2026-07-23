import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerInspectionsHSE, listerPointsInspectionHSE } from "@/lib/server-actions/qhse-inspection";
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
import { InspectionHSEForm } from "@/components/qhse/inspection-hse-form";

export default async function InspectionHSEPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "inspection-hse");

  const [inspections, points, projets] = await Promise.all([
    listerInspectionsHSE(),
    listerPointsInspectionHSE(),
    listerProjetsPourQHSE(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inspection HSE"
        description="26 points de contrôle — une réponse Non crée automatiquement une Non-Conformité."
        actions={<InspectionHSEForm points={points} projets={projets} />}
      />

      {inspections.length === 0 ? (
        <EmptyState title="Aucune inspection" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => {
                  const nombreNon = inspection.reponsesPoints.filter((r) => r.reponse === "NON").length;
                  const tonalite: Tonalite = nombreNon > 0 ? "danger" : "succes";
                  return (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">
                        HSE-{String(inspection.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>
                        {inspection.responsableInspection.prenom} {inspection.responsableInspection.nom}
                      </TableCell>
                      <TableCell>{inspection.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <StatutBadge
                          label={nombreNon > 0 ? `${nombreNon} non-conformité(s)` : "Aucune"}
                          tonalite={tonalite}
                        />
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/qhse/inspection-hse/${inspection.id}`}>Voir</Link>
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
