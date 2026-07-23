import { obtenirConsommationParVehicule } from "@/lib/server-actions/suivi-conso-carburant";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SuiviConsoCarburantPage() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const consommations = await obtenirConsommationParVehicule(debutMois, maintenant);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi consommation carburant"
        description="Ratio conso/100km par véhicule, mois en cours — indicateur distinct des dotations du module Gestion Carburant."
      />

      {consommations.length === 0 ? (
        <EmptyState title="Aucun véhicule" bordered />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Kilométrage parcouru</TableHead>
                  <TableHead>Quantité consommée</TableHead>
                  <TableHead>Ratio conso/100km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consommations.map(({ vehicule, quantiteConsommee, kilometrageParcouru, ratio }) => (
                  <TableRow key={vehicule.id}>
                    <TableCell className="font-medium">{vehicule.immatriculation}</TableCell>
                    <TableCell>{kilometrageParcouru.toLocaleString("fr-FR")} km</TableCell>
                    <TableCell>{quantiteConsommee.toLocaleString("fr-FR")} L</TableCell>
                    <TableCell>{ratio !== null ? `${ratio.toFixed(1)} L/100km` : "—"}</TableCell>
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
