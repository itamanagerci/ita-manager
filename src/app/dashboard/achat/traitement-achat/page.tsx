import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerDemandesAValiderTraitement } from "@/lib/server-actions/achat-traitement";
import { obtenirParametresAchat } from "@/lib/server-actions/achat-parametres";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParametresAchatForm } from "@/components/achat/parametres-achat-form";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_TRAITEMENT_ACHAT: "En attente de traitement",
  REFUSEE: "Refusée par un validateur — à corriger",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_TRAITEMENT_ACHAT: "attention",
  REFUSEE: "danger",
};

function libelleLigne(ligne: { designationLibre: string | null; article: { designation: string } | null }) {
  return ligne.article?.designation ?? ligne.designationLibre ?? "—";
}

export default async function TraitementAchatPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");

  const [demandes, parametres] = await Promise.all([
    listerDemandesAValiderTraitement(),
    obtenirParametresAchat(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Traitement des demandes d'achat"
        description="Prix, fournisseur, termes de paiement et sélection des validateurs."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres</CardTitle>
        </CardHeader>
        <CardContent>
          <ParametresAchatForm seuilUrgenceInitial={Number(parametres.seuilUrgence)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demandes à traiter</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {demandes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucune demande à traiter"
                description="Les demandes validées par un Directeur de département apparaîtront ici."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      ACH-{String(demande.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
                    <TableCell>{demande.lignes.map(libelleLigne).join(", ")}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[demande.statut]}
                        tonalite={TONALITE_STATUT[demande.statut]}
                      />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm">
                        <Link href={`/dashboard/achat/traitement-achat/${demande.id}`}>Traiter</Link>
                      </Button>
                    </TableCell>
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
