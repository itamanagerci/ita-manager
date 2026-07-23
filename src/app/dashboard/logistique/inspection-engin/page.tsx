import {
  listerPointsInspectionEngin,
  listerDocumentsInspectionEngin,
  listerInspectionsEngin,
} from "@/lib/server-actions/inspection-engin";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InspectionEnginForm } from "@/components/logistique/inspection-engin-form";

export default async function InspectionEnginPage() {
  const [points, documents, inspections, engins, chefs] = await Promise.all([
    listerPointsInspectionEngin(),
    listerDocumentsInspectionEngin(),
    listerInspectionsEngin(),
    prisma.vehicule.findMany({
      where: { type: "ENGIN" },
      select: { id: true, immatriculation: true },
      orderBy: { immatriculation: "asc" },
    }),
    prisma.utilisateur.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inspection Entrée Engin"
        description="Checklist distincte des véhicules légers/PL — une anomalie bloque réellement la mise en service."
        actions={<InspectionEnginForm engins={engins} points={points} documents={documents} chefs={chefs} />}
      />

      {inspections.length === 0 ? (
        <EmptyState title="Aucune inspection" description="Créez la première inspection avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Engin</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Chantier/site</TableHead>
                  <TableHead>Réceptionnaire</TableHead>
                  <TableHead>Anomalie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">
                      IE-{String(inspection.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>{inspection.vehicule.immatriculation}</TableCell>
                    <TableCell>{inspection.date.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{inspection.chantierSite}</TableCell>
                    <TableCell>
                      {inspection.receptionnaireVerificateur.prenom} {inspection.receptionnaireVerificateur.nom}
                    </TableCell>
                    <TableCell>
                      {inspection.anomalieDetectee ? (
                        <StatutBadge label="Anomalie — hors service" tonalite="danger" />
                      ) : (
                        <StatutBadge label="Aucune" tonalite="succes" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
