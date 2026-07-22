import { redirect } from "next/navigation";
import { getCurrentUtilisateur, peutValiderDirectionGenerale } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  listerAValiderAppelOffres,
  listerDemandesAppelOffres,
} from "@/lib/server-actions/appel-offres";
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
import { AppelOffresForm } from "@/components/direction-technique/appel-offres-form";
import { AppelOffresActions } from "@/components/direction-technique/appel-offres-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_DG: "En attente DG",
  VALIDE: "Validé",
  REFUSE: "Refusé",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_DG: "attention",
  VALIDE: "succes",
  REFUSE: "danger",
};

export default async function AppelOffresPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "appel-offres");

  const estDG = await peutValiderDirectionGenerale(utilisateur.id);

  const [aValider, toutes] = await Promise.all([
    listerAValiderAppelOffres(),
    listerDemandesAppelOffres(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appels d'offres"
        description="Soumission et validation des appels d'offres."
        actions={<AppelOffresForm />}
      />

      {estDG && aValider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant estimé</TableHead>
                  <TableHead>Délai de réponse</TableHead>
                  <TableHead>Initiateur</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValider.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.nom}</TableCell>
                    <TableCell>{demande.client}</TableCell>
                    <TableCell>
                      {Number(demande.montantEstime).toLocaleString("fr-FR")} FCFA
                    </TableCell>
                    <TableCell>{demande.delaiReponse.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {demande.initiateur.prenom} {demande.initiateur.nom}
                    </TableCell>
                    <TableCell>
                      <AppelOffresActions demandeId={demande.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {toutes.length === 0 ? (
        <EmptyState
          title="Aucun appel d'offres"
          description="Les appels d'offres soumis apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant estimé</TableHead>
                  <TableHead>Pièces jointes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Soumis le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toutes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.nom}</TableCell>
                    <TableCell>{demande.client}</TableCell>
                    <TableCell>
                      {Number(demande.montantEstime).toLocaleString("fr-FR")} FCFA
                    </TableCell>
                    <TableCell>{demande.piecesJointes.length}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[demande.statut]}
                        tonalite={TONALITE_STATUT[demande.statut]}
                      />
                    </TableCell>
                    <TableCell>{demande.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
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
