import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerProgrammesSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import { listerProjetsPourQHSE } from "@/lib/server-actions/qhse-partage";
import { PageHeader } from "@/components/ui/composed/page-header";
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
import { ProgrammeSensibilisationForm } from "@/components/qhse/programme-sensibilisation-form";

export default async function ProgrammeSensibilisationPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "programme-sensibilisation");

  const [programmes, projets] = await Promise.all([
    listerProgrammesSensibilisation(),
    listerProjetsPourQHSE(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Programme de Sensibilisation"
        description="Planifie plusieurs séances sur une période — chaque séance reçoit ensuite son propre procès-verbal."
        actions={<ProgrammeSensibilisationForm projets={projets} />}
      />

      {programmes.length === 0 ? (
        <EmptyState title="Aucun programme" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Séances</TableHead>
                  <TableHead>PV rédigés</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {programmes.map((programme) => (
                  <TableRow key={programme.id}>
                    <TableCell className="font-medium">
                      {programme.periodeDu.toLocaleDateString("fr-FR")} — {programme.periodeAu.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>{programme.seances.length}</TableCell>
                    <TableCell>{programme.seances.filter((s) => s.pv).length}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/qhse/programme-sensibilisation/${programme.id}`}>Voir</Link>
                      </Button>
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
