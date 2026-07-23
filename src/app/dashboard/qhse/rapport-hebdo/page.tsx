import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerRapportsHebdoQHSE } from "@/lib/server-actions/qhse-rapport-hebdo";
import { listerProjetsPourQHSE } from "@/lib/server-actions/qhse-partage";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RapportHebdoForm } from "@/components/qhse/rapport-hebdo-form";

export default async function RapportHebdoPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "rapport-hebdo");

  const [rapports, projets] = await Promise.all([listerRapportsHebdoQHSE(), listerProjetsPourQHSE()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rapport HSE Chantier Hebdomadaire"
        description="Saisie périodique par chantier, pas de circuit de validation."
        actions={<RapportHebdoForm projets={projets} />}
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
                  <TableHead>Relais QHSE</TableHead>
                  <TableHead>Semaine</TableHead>
                  <TableHead>Activités QHSE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rapports.map((rapport) => (
                  <TableRow key={rapport.id}>
                    <TableCell className="font-medium">RH-{String(rapport.numero).padStart(5, "0")}</TableCell>
                    <TableCell>
                      {rapport.relaisQHSE.prenom} {rapport.relaisQHSE.nom}
                    </TableCell>
                    <TableCell>
                      {rapport.semaineDu.toLocaleDateString("fr-FR")} — {rapport.semaineAu.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{rapport.activitesQHSE}</TableCell>
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
