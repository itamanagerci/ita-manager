import {
  listerCategoriesMateriel,
  listerUnitesMesure,
  listerMagasins,
  listerMaterielsInventaire,
} from "@/lib/server-actions/fiche-inventaire";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaterielForm } from "@/components/logistique/materiel-form";

export default async function FicheInventairePage() {
  const [categories, unitesMesure, magasins, materiels] = await Promise.all([
    listerCategoriesMateriel(),
    listerUnitesMesure(),
    listerMagasins(),
    listerMaterielsInventaire(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fiche Inventaire Article"
        description="Référentiel des articles suivis en stock, par magasin."
        actions={<MaterielForm categories={categories} unitesMesure={unitesMesure} magasins={magasins} />}
      />

      {materiels.length === 0 ? (
        <EmptyState title="Aucun article" description="Créez le premier article avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Stock actuel</TableHead>
                  <TableHead>Seuil alerte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière MAJ</TableHead>
                  <TableHead>Demande d&apos;achat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiels.map((materiel) => (
                  <TableRow key={materiel.id}>
                    <TableCell className="font-medium">{materiel.reference ?? "—"}</TableCell>
                    <TableCell>
                      {materiel.designation}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {materiel.uniteMesure?.nom}
                      </span>
                    </TableCell>
                    <TableCell>{materiel.categorie?.nom ?? "—"}</TableCell>
                    <TableCell>{materiel.magasin?.code ?? "—"}</TableCell>
                    <TableCell>{materiel.quantiteStock ?? "—"}</TableCell>
                    <TableCell>{materiel.seuilAlerte ?? "—"}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={materiel.statutStock === "ALERTE" ? "Alerte" : "OK"}
                        tonalite={materiel.statutStock === "ALERTE" ? "danger" : "succes"}
                      />
                    </TableCell>
                    <TableCell>{materiel.dateModification.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {materiel.demandeAchatEnCours ? (
                        <StatutBadge label="Oui" tonalite="attention" />
                      ) : (
                        <StatutBadge label="Non" tonalite="neutre" />
                      )}
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
