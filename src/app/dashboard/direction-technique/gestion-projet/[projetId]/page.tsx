import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirProjet } from "@/lib/server-actions/gestion-projet";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PointValidationForm } from "@/components/direction-technique/point-validation-form";
import { PointValidationActions } from "@/components/direction-technique/point-validation-actions";

const TONALITE_STATUT: Record<string, Tonalite> = {
  A_FAIRE: "attention",
  FAIT: "succes",
};

const LABEL_STATUT: Record<string, string> = {
  A_FAIRE: "À faire",
  FAIT: "Fait",
};

interface ProjetDetailPageProps {
  params: Promise<{ projetId: string }>;
}

export default async function ProjetDetailPage({ params }: ProjetDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "gestion-projet");

  const { projetId } = await params;
  const projet = await obtenirProjet(projetId);
  if (!projet) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={projet.nom}
        description={`Chef de projet : ${projet.chefProjet.prenom} ${projet.chefProjet.nom}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Date de début</p>
            <p className="font-medium">{projet.dateDebut.toLocaleDateString("fr-FR")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date de fin</p>
            <p className="font-medium">
              {projet.dateFin ? projet.dateFin.toLocaleDateString("fr-FR") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="font-medium">{projet.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Points de validation</CardTitle>
          <PointValidationForm projetId={projet.id} />
        </CardHeader>
        <CardContent className="p-0">
          {projet.pointsValidation.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun point de validation" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Coché par</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projet.pointsValidation.map((point) => (
                  <TableRow key={point.id}>
                    <TableCell className="font-medium">{point.libelle}</TableCell>
                    <TableCell>{point.echeance.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[point.statut]}
                        tonalite={TONALITE_STATUT[point.statut]}
                      />
                    </TableCell>
                    <TableCell>
                      {point.cocheur ? `${point.cocheur.prenom} ${point.cocheur.nom}` : "—"}
                    </TableCell>
                    <TableCell>
                      {point.statut === "A_FAIRE" && <PointValidationActions pointId={point.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
