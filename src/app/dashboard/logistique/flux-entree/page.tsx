import {
  listerBonsEntreeMagasin,
  listerAValiderBEM,
} from "@/lib/server-actions/flux-entree";
import { listerMagasins } from "@/lib/server-actions/fiche-inventaire";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BonEntreeForm } from "@/components/logistique/bon-entree-form";
import { ValiderBEMButton } from "@/components/logistique/valider-bem-button";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_VALIDATION: "En attente de validation",
  VALIDE: "Validé",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_VALIDATION: "attention",
  VALIDE: "succes",
};

export default async function FluxEntreePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "flux-entree");

  const peutValider = await possedeAccesSousModule(utilisateur.id, "logistique", "magasins");

  const [bons, aValider, magasins, materiels] = await Promise.all([
    listerBonsEntreeMagasin(),
    listerAValiderBEM(),
    listerMagasins(),
    prisma.materiel.findMany({
      where: { magasinId: { not: null } },
      select: { id: true, designation: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flux Entrée Stock"
        description="Bon d'Entrée Magasin (BEM) — la validation met à jour la fiche inventaire."
        actions={<BonEntreeForm magasins={magasins} materiels={materiels} />}
      />

      {peutValider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider (Logisticien)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aValider.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à valider" bordered={false} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Magasin</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Réceptionné par</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aValider.map((bem) => (
                    <TableRow key={bem.id}>
                      <TableCell className="font-medium">
                        BEM-{String(bem.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{bem.magasin.code}</TableCell>
                      <TableCell>{bem.fournisseur}</TableCell>
                      <TableCell>
                        {bem.receptionnePar ? `${bem.receptionnePar.prenom} ${bem.receptionnePar.nom}` : "—"}
                      </TableCell>
                      <TableCell>
                        <ValiderBEMButton bemId={bem.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {bons.length === 0 ? (
        <EmptyState title="Aucun bon d'entrée" description="Les bons enregistrés apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bons.map((bem) => (
                  <TableRow key={bem.id}>
                    <TableCell className="font-medium">
                      BEM-{String(bem.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>{bem.magasin.code}</TableCell>
                    <TableCell>{bem.fournisseur}</TableCell>
                    <TableCell>{bem.lignes.map((l) => l.materiel.designation).join(", ")}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[bem.statut]}
                        tonalite={TONALITE_STATUT[bem.statut]}
                      />
                    </TableCell>
                    <TableCell>{bem.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
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
