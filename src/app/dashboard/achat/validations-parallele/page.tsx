import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerAValiderParallele } from "@/lib/server-actions/achat-validations";
import { LABEL_ROLE } from "@/lib/achat-constants";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ValidationParalleleActions } from "@/components/achat/validation-parallele-actions";

function libelleLigne(ligne: { designationLibre: string | null; article: { designation: string } | null }) {
  return ligne.article?.designation ?? ligne.designationLibre ?? "—";
}

export default async function ValidationsParallelePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "achat", "validations-parallele");

  const aValider = await listerAValiderParallele();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validations parallèles — Achat"
        description="Demandes en attente de votre validation (DT/RH/DFC/DG) — toutes les validations requises doivent être données, un seul refus bloque la demande."
      />

      {aValider.length === 0 ? (
        <EmptyState
          title="Aucune validation en attente"
          description="Les demandes standard vous nécessitant comme validateur apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValider.map((validation) => (
                  <TableRow key={validation.id}>
                    <TableCell className="font-medium">
                      ACH-{String(validation.demande.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_ROLE[validation.role]} tonalite="info" />
                    </TableCell>
                    <TableCell>
                      {validation.demande.demandeur.prenom} {validation.demande.demandeur.nom}
                    </TableCell>
                    <TableCell>{validation.demande.lignes.map(libelleLigne).join(", ")}</TableCell>
                    <TableCell>
                      {validation.demande.montantTotalTTC != null
                        ? `${Number(validation.demande.montantTotalTTC).toLocaleString("fr-FR")} F CFA`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ValidationParalleleActions validationId={validation.id} />
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
