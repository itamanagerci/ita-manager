import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerAccueilsSecurite } from "@/lib/server-actions/qhse-accueil-securite";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LABEL_STATUT: Record<string, string> = { EN_ATTENTE: "En attente", EFFECTUE: "Effectué" };
const TONALITE_STATUT: Record<string, Tonalite> = { EN_ATTENTE: "attention", EFFECTUE: "succes" };

export default async function AccueilSecuritePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "accueil-securite");

  const accueils = await listerAccueilsSecurite();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accueil Sécurité"
        description="Créée automatiquement à chaque création de compte — à compléter à l'arrivée du travailleur."
      />

      {accueils.length === 0 ? (
        <EmptyState title="Aucune fiche" description="Les fiches apparaissent automatiquement à la création d'un compte." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Travailleur</TableHead>
                  <TableHead>Fonction</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {accueils.map((accueil) => (
                  <TableRow key={accueil.id}>
                    <TableCell className="font-medium">
                      {accueil.utilisateur.prenom} {accueil.utilisateur.nom}
                    </TableCell>
                    <TableCell>{accueil.utilisateur.fonction.nom}</TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_STATUT[accueil.statut]} tonalite={TONALITE_STATUT[accueil.statut]} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant={accueil.statut === "EN_ATTENTE" ? "default" : "outline"}>
                        <Link href={`/dashboard/qhse/accueil-securite/${accueil.id}`}>
                          {accueil.statut === "EN_ATTENTE" ? "Compléter" : "Voir"}
                        </Link>
                      </Button>
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
