import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerPVSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
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

export default async function PVSensibilisationPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "pv-sensibilisation");

  const pvs = await listerPVSensibilisation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PV de Sensibilisation"
        description="Un procès-verbal se crée depuis une séance planifiée dans un Programme de Sensibilisation."
      />

      {pvs.length === 0 ? (
        <EmptyState
          title="Aucun procès-verbal"
          description="Créez d'abord un Programme de Sensibilisation, puis rédigez le PV depuis une de ses séances."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thème</TableHead>
                  <TableHead>Animateur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pvs.map((pv) => (
                  <TableRow key={pv.id}>
                    <TableCell className="font-medium">{pv.seance.theme}</TableCell>
                    <TableCell>{pv.animateur}</TableCell>
                    <TableCell>{pv.date.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{pv.participants.length}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/qhse/pv-sensibilisation/${pv.id}`}>Voir</Link>
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
