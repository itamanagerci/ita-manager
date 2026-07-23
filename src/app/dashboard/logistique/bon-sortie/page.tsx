import { listerBonsSortieTransfert } from "@/lib/server-actions/bon-sortie-transfert";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BonSortieTransfertForm } from "@/components/logistique/bon-sortie-transfert-form";
import { BonSortieTransfertActions } from "@/components/logistique/bon-sortie-transfert-actions";

const LABEL_STATUT: Record<string, string> = {
  CREE: "Créé",
  ARTICLES_RENSEIGNES: "Articles renseignés",
  SIGNE: "Signé",
};
const TONALITE_STATUT: Record<string, Tonalite> = {
  CREE: "attention",
  ARTICLES_RENSEIGNES: "attention",
  SIGNE: "succes",
};

export default async function BonSortiePage() {
  const [bons, materiels] = await Promise.all([
    listerBonsSortieTransfert(),
    prisma.materiel.findMany({
      where: { magasinId: { not: null } },
      select: { id: true, designation: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bon de Sortie et Transfert"
        description="Sortie ou transfert de tout matériel/équipement/immobilisation — triple signature."
        actions={<BonSortieTransfertForm materiels={materiels} />}
      />

      {bons.length === 0 ? (
        <EmptyState title="Aucun bon" description="Créez le premier bon avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bons.map((bon) => (
                  <TableRow key={bon.id}>
                    <TableCell className="font-medium">BST-{String(bon.numero).padStart(5, "0")}</TableCell>
                    <TableCell>{bon.motif}</TableCell>
                    <TableCell>{bon.destination}</TableCell>
                    <TableCell>
                      {bon.demandeur.prenom} {bon.demandeur.nom}
                    </TableCell>
                    <TableCell>{bon.lignes.map((l) => l.materiel.designation).join(", ")}</TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_STATUT[bon.statut]} tonalite={TONALITE_STATUT[bon.statut]} />
                    </TableCell>
                    <TableCell>
                      <BonSortieTransfertActions bonId={bon.id} statut={bon.statut} />
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
