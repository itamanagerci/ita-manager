import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerBonsDeCommande } from "@/lib/server-actions/achat-bons-commande";
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
import { BonCommandeActions } from "@/components/achat/bon-commande-actions";

const LABEL_STATUT: Record<string, string> = {
  OUVERT: "Ouvert",
  ENVOYE: "Envoyé",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  OUVERT: "attention",
  ENVOYE: "succes",
};

export default async function BonsDeCommandePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  // Pas de sous-module dédié "bons-commande" — gaté par traitement-achat,
  // cf. CLAUDE.md.
  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");

  const bonsDeCommande = await listerBonsDeCommande();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bons de Commande"
        description="Groupés par fournisseur — plusieurs demandes pour le même fournisseur s'agrègent dans un même Bon de Commande ouvert."
      />

      {bonsDeCommande.length === 0 ? (
        <EmptyState
          title="Aucun Bon de Commande"
          description="Émis automatiquement à la validation complète d'une demande (ou immédiatement si urgente)."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {bonsDeCommande.map((bc) => {
            const montantTotal = bc.lignes.reduce((total, ligne) => total + Number(ligne.montantLigneTTC), 0);
            return (
              <Card key={bc.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    BC-{String(bc.numero).padStart(5, "0")} — {bc.fournisseur}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <StatutBadge label={LABEL_STATUT[bc.statut]} tonalite={TONALITE_STATUT[bc.statut]} />
                    {bc.statut === "OUVERT" && <BonCommandeActions bonDeCommandeId={bc.id} />}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Demande d&apos;origine</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                        <TableHead>Montant TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bc.lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>
                            {ligne.ligneDemandeAchat.article?.designation ??
                              ligne.ligneDemandeAchat.designationLibre}
                          </TableCell>
                          <TableCell>
                            ACH-{String(ligne.ligneDemandeAchat.demande.numero).padStart(5, "0")}
                          </TableCell>
                          <TableCell>{ligne.quantite}</TableCell>
                          <TableCell>{Number(ligne.prixUnitaire).toLocaleString("fr-FR")} F CFA</TableCell>
                          <TableCell>{Number(ligne.montantLigneTTC).toLocaleString("fr-FR")} F CFA</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border p-4 text-right text-sm font-semibold">
                    Total : {montantTotal.toLocaleString("fr-FR")} F CFA
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
