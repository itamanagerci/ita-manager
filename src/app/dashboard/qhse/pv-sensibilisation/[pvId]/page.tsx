import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirPVSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PVDetailPageProps {
  params: Promise<{ pvId: string }>;
}

export default async function PVDetailPage({ params }: PVDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "pv-sensibilisation");

  const { pvId } = await params;
  const pv = await obtenirPVSensibilisation(pvId);
  if (!pv) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`PV de Sensibilisation — ${pv.seance.theme}`}
        description={`Animé par ${pv.animateur} le ${pv.date.toLocaleDateString("fr-FR")}${pv.lieu ? ` — ${pv.lieu}` : ""}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sujets abordés</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {pv.sujetsAbordes.join(", ") || "—"}
          {pv.pointsSpecifiquesAbordes && (
            <p className="mt-2 text-muted-foreground">{pv.pointsSpecifiquesAbordes}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participants ({pv.participants.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Signé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pv.participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>{participant.numero}</TableCell>
                  <TableCell>{participant.nom}</TableCell>
                  <TableCell>{participant.poste ?? "—"}</TableCell>
                  <TableCell>{participant.aSigne ? "Oui" : "Non"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pv.resumeSensibilisation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{pv.resumeSensibilisation}</CardContent>
        </Card>
      )}
    </div>
  );
}
