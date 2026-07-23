import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  listerMaterielsEPI,
  listerAttributionsEPI,
  listerBeneficiairesEPI,
} from "@/lib/server-actions/qhse-stock-epi";
import { listerProjetsPourQHSE } from "@/lib/server-actions/qhse-partage";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttributionEPIForm } from "@/components/qhse/attribution-epi-form";

export default async function StockEPIPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "stock-epi");

  const [materiels, attributions, beneficiaires, projets] = await Promise.all([
    listerMaterielsEPI(),
    listerAttributionsEPI(),
    listerBeneficiairesEPI(),
    listerProjetsPourQHSE(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion du stock des EPI"
        description="Vue filtrée sur le référentiel Materiel (catégorie EPI) — les mouvements passent par la même comptabilité de stock que la Logistique."
        actions={<AttributionEPIForm materiels={materiels} beneficiaires={beneficiaires} projets={projets} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock EPI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {materiels.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun article EPI référencé" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Seuil d&apos;alerte</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiels.map((materiel) => {
                  const sousSeuil =
                    materiel.seuilAlerte != null &&
                    materiel.quantiteStock != null &&
                    materiel.quantiteStock <= materiel.seuilAlerte;
                  const tonalite: Tonalite = sousSeuil ? "danger" : "succes";
                  return (
                    <TableRow key={materiel.id}>
                      <TableCell className="font-medium">{materiel.designation}</TableCell>
                      <TableCell>{materiel.magasin?.nom ?? "—"}</TableCell>
                      <TableCell>{materiel.quantiteStock ?? "—"}</TableCell>
                      <TableCell>{materiel.seuilAlerte ?? "—"}</TableCell>
                      <TableCell>
                        <StatutBadge label={sousSeuil ? "Sous seuil" : "OK"} tonalite={tonalite} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attributions EPI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attributions.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune attribution" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributions.map((attribution) => (
                  <TableRow key={attribution.id}>
                    <TableCell className="font-medium">
                      EPI-{String(attribution.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>
                      {attribution.beneficiaire.prenom} {attribution.beneficiaire.nom}
                    </TableCell>
                    <TableCell>{attribution.materiel.designation}</TableCell>
                    <TableCell>{attribution.quantiteSortie}</TableCell>
                    <TableCell>{attribution.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
