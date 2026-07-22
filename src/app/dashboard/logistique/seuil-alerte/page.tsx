import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  verifierEtCreerDemandesReapprovisionnement,
  listerMaterielsSousSeuil,
  listerDemandesReapprovisionnement,
} from "@/lib/server-actions/seuil-alerte";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SeuilAlertePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "seuil-alerte");

  await verifierEtCreerDemandesReapprovisionnement(utilisateur.id);

  const [materielsSousSeuil, demandesReapprovisionnement] = await Promise.all([
    listerMaterielsSousSeuil(),
    listerDemandesReapprovisionnement(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Seuil d'Alerte / Réapprovisionnement"
        description="Détection automatique des articles sous seuil — point d'entrée du futur circuit Achat (Lot 7)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Articles sous seuil</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {materielsSousSeuil.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun article sous seuil" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Stock actuel</TableHead>
                  <TableHead>Seuil alerte</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materielsSousSeuil.map((materiel) => (
                  <TableRow key={materiel.id}>
                    <TableCell className="font-medium">{materiel.designation}</TableCell>
                    <TableCell>{materiel.magasin?.code}</TableCell>
                    <TableCell>{materiel.quantiteStock}</TableCell>
                    <TableCell>{materiel.seuilAlerte}</TableCell>
                    <TableCell>
                      <StatutBadge label="Alerte" tonalite="danger" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">En attente du module Achat (Lot 7)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {demandesReapprovisionnement.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune demande d'achat en cours" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Stock constaté</TableHead>
                  <TableHead>Seuil constaté</TableHead>
                  <TableHead>Date de détection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandesReapprovisionnement.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.materiel.designation}</TableCell>
                    <TableCell>{demande.materiel.magasin?.code}</TableCell>
                    <TableCell>{demande.quantiteStockConstatee}</TableCell>
                    <TableCell>{demande.seuilAlerteConstate}</TableCell>
                    <TableCell>{demande.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
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
