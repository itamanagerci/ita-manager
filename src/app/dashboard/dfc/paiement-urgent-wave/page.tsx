import { redirect } from "next/navigation";
import { getCurrentUtilisateur, peutValiderDirectionGenerale } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  listerBeneficiairesUtilisateurs,
  listerCodesAValider,
  listerMesCodes,
  listerPaiementsUrgentsEffectues,
} from "@/lib/server-actions/dfc-paiement-urgent";
import { listerFournisseurs } from "@/lib/server-actions/dfc-fournisseurs";
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
import { DemandeCodeUrgentForm } from "@/components/dfc/demande-code-urgent-form";
import { CodeUrgentActions } from "@/components/dfc/code-urgent-actions";
import { ExecutionPaiementUrgentForm } from "@/components/dfc/execution-paiement-urgent-form";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_DG: "En attente de la Direction Générale",
  VALIDE: "Validé",
  REFUSE: "Refusé",
  UTILISE: "Utilisé",
  EXPIRE: "Expiré",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_DG: "attention",
  VALIDE: "succes",
  REFUSE: "danger",
  UTILISE: "neutre",
  EXPIRE: "danger",
};

export default async function PaiementUrgentWavePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "dfc", "paiement-urgent-wave");

  const [mesCodes, codesAValider, estValideurDG, utilisateurs, fournisseurs, historique] =
    await Promise.all([
      listerMesCodes(),
      listerCodesAValider(),
      peutValiderDirectionGenerale(utilisateur.id),
      listerBeneficiairesUtilisateurs(),
      listerFournisseurs(),
      listerPaiementsUrgentsEffectues(),
    ]);

  const codeUtilisable = mesCodes.find(
    (c) => c.statut === "VALIDE" && c.dateExpiration && c.dateExpiration > new Date() && c.code,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Paiement urgent Wave"
        description="Hors circuit standard — nécessite un code d'autorisation de la Direction Générale, valable 24h. Circuit Wave simulé, aucune vraie API connectée."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes codes d&apos;autorisation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {mesCodes.length === 0 ? (
            <EmptyState title="Aucune demande" bordered={false} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Justification</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Expiration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mesCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.justification}</TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_STATUT[c.statut]} tonalite={TONALITE_STATUT[c.statut]} />
                    </TableCell>
                    <TableCell>
                      {c.dateExpiration ? c.dateExpiration.toLocaleString("fr-FR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!codeUtilisable && <DemandeCodeUrgentForm />}
        </CardContent>
      </Card>

      {codeUtilisable && codeUtilisable.code && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exécuter un paiement urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutionPaiementUrgentForm
              code={codeUtilisable.code}
              utilisateurs={utilisateurs}
              fournisseurs={fournisseurs}
            />
          </CardContent>
        </Card>
      )}

      {estValideurDG && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demandes de code à valider (Direction Générale)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {codesAValider.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à valider" bordered={false} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Justification</TableHead>
                    <TableHead className="w-56" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codesAValider.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {c.demandeur.prenom} {c.demandeur.nom}
                      </TableCell>
                      <TableCell>{c.justification}</TableCell>
                      <TableCell>
                        <CodeUrgentActions codeId={c.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des paiements urgents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historique.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun paiement urgent" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Référence (simulation)</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historique.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.beneficiaireUtilisateur
                        ? `${p.beneficiaireUtilisateur.prenom} ${p.beneficiaireUtilisateur.nom}`
                        : (p.beneficiaireFournisseur?.nom ?? "—")}
                    </TableCell>
                    <TableCell>{Number(p.montant).toLocaleString("fr-FR")} F CFA</TableCell>
                    <TableCell>
                      <StatutBadge label={p.referenceSimulee} tonalite="attention" />
                    </TableCell>
                    <TableCell>{p.dateExecution.toLocaleString("fr-FR")}</TableCell>
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
