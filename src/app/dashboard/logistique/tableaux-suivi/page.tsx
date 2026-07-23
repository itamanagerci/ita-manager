import { obtenirSyntheseMensuelleParMagasin, obtenirDisponibiliteVehicules } from "@/lib/server-actions/tableaux-suivi";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABEL_TYPE: Record<string, string> = { LEGER: "Léger", LOURD: "Lourd (PL)", ENGIN: "Engin" };

export default async function TableauxSuiviPage() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const [synthese, disponibilite] = await Promise.all([
    obtenirSyntheseMensuelleParMagasin(debutMois, maintenant),
    obtenirDisponibiliteVehicules(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tableaux de suivi"
        description="Synthèse mensuelle par magasin et disponibilité de la flotte véhicules/engins."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synthèse mensuelle par magasin</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Magasin</TableHead>
                <TableHead>Articles en stock</TableHead>
                <TableHead>Entrées (mois)</TableHead>
                <TableHead>Sorties (mois)</TableHead>
                <TableHead>Alertes actives</TableHead>
                <TableHead>Demandes en cours</TableHead>
                <TableHead>Dernier inventaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {synthese.map((ligne) => (
                <TableRow key={ligne.magasin.id}>
                  <TableCell className="font-medium">{ligne.magasin.code}</TableCell>
                  <TableCell>{ligne.articlesEnStock}</TableCell>
                  <TableCell>{ligne.entrees}</TableCell>
                  <TableCell>{ligne.sorties}</TableCell>
                  <TableCell>{ligne.alertesActives}</TableCell>
                  <TableCell>{ligne.demandesEnCours}</TableCell>
                  <TableCell>{ligne.dateDernierInventaire?.toLocaleDateString("fr-FR") ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilité flotte</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>En service</TableHead>
                <TableHead>Indisponibles</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Taux de disponibilité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disponibilite.map((ligne) => (
                <TableRow key={ligne.type}>
                  <TableCell className="font-medium">{LABEL_TYPE[ligne.type]}</TableCell>
                  <TableCell>{ligne.enService}</TableCell>
                  <TableCell>{ligne.indisponibles}</TableCell>
                  <TableCell>{ligne.total}</TableCell>
                  <TableCell>
                    {ligne.tauxDisponibilite !== null ? `${(ligne.tauxDisponibilite * 100).toFixed(0)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
