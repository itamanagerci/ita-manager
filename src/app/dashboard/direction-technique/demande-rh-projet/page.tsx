import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { peutValiderRH } from "@/lib/server-actions/rh-partage";
import {
  listerContrePropositionsAValider,
  listerDemandesRHProjet,
  listerLignesAValiderRH,
  listerOuvriers,
} from "@/lib/server-actions/demande-rh-projet";
import { prisma } from "@/lib/prisma";
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
import { DemandeRHProjetForm } from "@/components/direction-technique/demande-rh-projet-form";
import { LigneActions } from "@/components/direction-technique/ligne-actions";
import { ContrePropositionActions } from "@/components/direction-technique/contre-proposition-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_RH: "En attente RH",
  CONTRE_PROPOSEE: "Contre-proposée",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_RH: "attention",
  CONTRE_PROPOSEE: "attention",
  VALIDEE: "succes",
  REFUSEE: "danger",
};

export default async function DemandeRHProjetPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "demande-rh-projet");

  const estRH = await peutValiderRH(utilisateur.id);

  const [lignesAValider, contrePropositions, demandes, projets, ouvriers] = await Promise.all([
    listerLignesAValiderRH(),
    listerContrePropositionsAValider(),
    listerDemandesRHProjet(),
    prisma.projet.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    listerOuvriers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demande de ressource humaine"
        description="Profils demandés par projet, traités ligne par ligne."
        actions={<DemandeRHProjetForm projets={projets} />}
      />

      {estRH && lignesAValider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider (RH)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Compétence</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Taux demandé</TableHead>
                  <TableHead>Initiateur</TableHead>
                  <TableHead className="w-72" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignesAValider.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell className="font-medium">{ligne.demande.projet.nom}</TableCell>
                    <TableCell>{ligne.competence}</TableCell>
                    <TableCell>{ligne.periode}</TableCell>
                    <TableCell>
                      {Number(ligne.tauxJournalierPropose).toLocaleString("fr-FR")} FCFA
                    </TableCell>
                    <TableCell>
                      {ligne.demande.initiateur.prenom} {ligne.demande.initiateur.nom}
                    </TableCell>
                    <TableCell>
                      <LigneActions ligneId={ligne.id} ouvriers={ouvriers} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {contrePropositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contre-propositions à traiter</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Compétence proposée</TableHead>
                  <TableHead>Ouvrier proposé</TableHead>
                  <TableHead>Taux proposé</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contrePropositions.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell className="font-medium">{ligne.demande.projet.nom}</TableCell>
                    <TableCell>{ligne.competenceContreProposee}</TableCell>
                    <TableCell>
                      {ligne.ouvrierContrePropose
                        ? `${ligne.ouvrierContrePropose.prenom} ${ligne.ouvrierContrePropose.nom}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {ligne.tauxJournalierContrePropose
                        ? `${Number(ligne.tauxJournalierContrePropose).toLocaleString("fr-FR")} FCFA`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ContrePropositionActions ligneId={ligne.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {demandes.length === 0 ? (
        <EmptyState
          title="Aucune demande RH"
          description="Les demandes de ressource humaine soumises apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Initiateur</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Soumise le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.projet.nom}</TableCell>
                    <TableCell>
                      {demande.initiateur.prenom} {demande.initiateur.nom}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {demande.lignes.map((ligne) => (
                          <StatutBadge
                            key={ligne.id}
                            label={`${ligne.competence} — ${LABEL_STATUT[ligne.statut]}`}
                            tonalite={TONALITE_STATUT[ligne.statut]}
                          />
                        ))}
                      </div>
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
