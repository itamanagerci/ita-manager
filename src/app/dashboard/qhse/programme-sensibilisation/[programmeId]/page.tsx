import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirProgrammeSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
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
import { SeanceSensibilisationForm } from "@/components/qhse/seance-sensibilisation-form";

interface ProgrammeDetailPageProps {
  params: Promise<{ programmeId: string }>;
}

export default async function ProgrammeDetailPage({ params }: ProgrammeDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "programme-sensibilisation");

  const { programmeId } = await params;
  const programme = await obtenirProgrammeSensibilisation(programmeId);
  if (!programme) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Programme — ${programme.periodeDu.toLocaleDateString("fr-FR")} au ${programme.periodeAu.toLocaleDateString("fr-FR")}`}
        actions={<SeanceSensibilisationForm programmeId={programme.id} />}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Thème</TableHead>
                <TableHead>Animateur</TableHead>
                <TableHead>PV</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {programme.seances.map((seance) => {
                const tonalite: Tonalite = seance.pv ? "succes" : "attention";
                return (
                  <TableRow key={seance.id}>
                    <TableCell>{seance.date.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{seance.theme}</TableCell>
                    <TableCell>{seance.animateur}</TableCell>
                    <TableCell>
                      <StatutBadge label={seance.pv ? "Rédigé" : "En attente"} tonalite={tonalite} />
                    </TableCell>
                    <TableCell>
                      {seance.pv ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/qhse/pv-sensibilisation/${seance.pv.id}`}>Voir le PV</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/qhse/pv-sensibilisation/nouveau/${seance.id}`}>Créer le PV</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
