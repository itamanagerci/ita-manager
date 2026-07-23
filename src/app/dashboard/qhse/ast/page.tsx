import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerFichesAST, peutValiderAST } from "@/lib/server-actions/qhse-ast";
import { listerProjetsPourQHSE } from "@/lib/server-actions/qhse-partage";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASTForm } from "@/components/qhse/ast-form";
import { ASTActions } from "@/components/qhse/ast-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_VALIDATION_QHSE: "En attente de validation QHSE",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_VALIDATION_QHSE: "attention",
  VALIDEE: "succes",
  REFUSEE: "danger",
};

export default async function ASTPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "ast");

  const [fiches, projets, estValideur] = await Promise.all([
    listerFichesAST(),
    listerProjetsPourQHSE(),
    peutValiderAST(utilisateur.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analyse Sécuritaire des Tâches"
        description="Circuit de validation standard avant démarrage d'une tâche à risque."
        actions={<ASTForm projets={projets} />}
      />

      {fiches.length === 0 ? (
        <EmptyState title="Aucune fiche AST" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Chef de chantier</TableHead>
                  <TableHead>Tâches</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiches.map((fiche) => (
                  <TableRow key={fiche.id}>
                    <TableCell className="font-medium">ACT-{String(fiche.numero).padStart(5, "0")}</TableCell>
                    <TableCell>
                      {fiche.chefChantier.prenom} {fiche.chefChantier.nom}
                    </TableCell>
                    <TableCell>{fiche.taches.length}</TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_STATUT[fiche.statut]} tonalite={TONALITE_STATUT[fiche.statut]} />
                    </TableCell>
                    <TableCell>
                      {estValideur && fiche.statut === "EN_ATTENTE_VALIDATION_QHSE" && utilisateur.id !== fiche.chefChantierId && (
                        <ASTActions astId={fiche.id} />
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
