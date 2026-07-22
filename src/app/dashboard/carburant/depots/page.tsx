import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerDepots } from "@/lib/server-actions/carburant";
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
import { ReapprovisionnerForm } from "@/components/carburant/reapprovisionner-form";

export default async function DepotsPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "carburant", "depots");

  const depots = await listerDepots();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dépôts carburant"
        description="Lieux de stockage et niveaux de stock."
        actions={<ReapprovisionnerForm depots={depots.map((d) => ({ id: d.id, nom: d.nom }))} />}
      />

      {depots.length === 0 ? (
        <EmptyState
          title="Aucun dépôt"
          description="Aucun dépôt n'est encore enregistré."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Chantiers rattachés</TableHead>
                  <TableHead>Stock actuel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depots.map((depot) => (
                  <TableRow key={depot.id}>
                    <TableCell className="font-medium">{depot.nom}</TableCell>
                    <TableCell>{depot.localisation}</TableCell>
                    <TableCell>{depot.chantiersRattaches.join(", ") || "—"}</TableCell>
                    <TableCell>{depot.quantiteStockLitres.toLocaleString("fr-FR")} L</TableCell>
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
