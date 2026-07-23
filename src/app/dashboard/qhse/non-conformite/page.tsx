import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerNonConformites } from "@/lib/server-actions/qhse-non-conformite";
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
import { NonConformiteForm } from "@/components/qhse/non-conformite-form";

const LABEL_STATUT: Record<string, string> = { OUVERTE: "Ouverte", CLOTUREE: "Clôturée" };
const TONALITE_STATUT: Record<string, Tonalite> = { OUVERTE: "attention", CLOTUREE: "succes" };

export default async function NonConformitePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "non-conformite");

  const nonConformites = await listerNonConformites();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Non-Conformité"
        description="Point d'arrivée partagé — créées automatiquement depuis une Inspection HSE (point Non) ou un Rapport Incident, ou manuellement."
        actions={<NonConformiteForm />}
      />

      {nonConformites.length === 0 ? (
        <EmptyState title="Aucune non-conformité" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Identificateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonConformites.map((nc) => (
                  <TableRow key={nc.id}>
                    <TableCell className="max-w-sm truncate font-medium">{nc.descriptionNonConformite}</TableCell>
                    <TableCell>{nc.typeNonConformite}</TableCell>
                    <TableCell>
                      {nc.identificateur.prenom} {nc.identificateur.nom}
                    </TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_STATUT[nc.statut]} tonalite={TONALITE_STATUT[nc.statut]} />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/qhse/non-conformite/${nc.id}`}>Voir</Link>
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
