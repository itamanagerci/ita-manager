import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { getModulesMetier } from "@/lib/server-actions/demande-index";
import {
  listerArticlesPourDemandeAchat,
  listerAValiderDirecteurAchat,
  listerMesDemandesAchat,
  listerProjetsPourDemandeAchat,
} from "@/lib/server-actions/achat-demandes";
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
import { DemandeAchatForm } from "@/components/achat/demande-achat-form";
import { DemandeAchatDirecteurActions } from "@/components/achat/demande-achat-directeur-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_DIRECTEUR: "En attente du Directeur",
  EN_ATTENTE_TRAITEMENT_ACHAT: "En attente de traitement Achat",
  EN_ATTENTE_VALIDATION_PARALLELE: "En attente de validation parallèle",
  REFUSEE: "Refusée",
  BC_EMIS: "Bon de Commande émis",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_DIRECTEUR: "attention",
  EN_ATTENTE_TRAITEMENT_ACHAT: "attention",
  EN_ATTENTE_VALIDATION_PARALLELE: "attention",
  REFUSEE: "danger",
  BC_EMIS: "succes",
};

function libelleLigne(ligne: { designationLibre: string | null; article: { designation: string } | null }) {
  return ligne.article?.designation ?? ligne.designationLibre ?? "—";
}

export default async function DemandeAchatPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "achat", "demande-achat");

  const [articles, projets, modulesService, mesDemandes, aValiderDirecteur] = await Promise.all([
    listerArticlesPourDemandeAchat(),
    listerProjetsPourDemandeAchat(),
    getModulesMetier(),
    listerMesDemandesAchat(),
    listerAValiderDirecteurAchat(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demande d'achat"
        description="Soumission et suivi de vos demandes d'achat."
        actions={<DemandeAchatForm articles={articles} projets={projets} modulesService={modulesService} />}
      />

      {aValiderDirecteur.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider (Directeur de département)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Justification</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValiderDirecteur.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
                    <TableCell>{demande.lignes.map(libelleLigne).join(", ")}</TableCell>
                    <TableCell>{demande.justification}</TableCell>
                    <TableCell>
                      <DemandeAchatDirecteurActions demandeId={demande.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes demandes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mesDemandes.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucune demande"
                description="Vos demandes d'achat apparaîtront ici."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Soumise le</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mesDemandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      ACH-{String(demande.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>{demande.lignes.map(libelleLigne).join(", ")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatutBadge
                          label={LABEL_STATUT[demande.statut]}
                          tonalite={TONALITE_STATUT[demande.statut]}
                        />
                        {demande.statut === "REFUSEE" && demande.motifRefus && (
                          <span className="text-xs text-muted-foreground">{demande.motifRefus}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{demande.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {demande.statut === "REFUSEE" && demande.etapeBlocage === "DIRECTEUR" && (
                        <DemandeAchatForm
                          articles={articles}
                          projets={projets}
                          modulesService={modulesService}
                          demandeId={demande.id}
                          valeursInitiales={{
                            forType: demande.forType,
                            forServiceModuleCode: demande.forServiceModuleCode ?? undefined,
                            projetId: demande.projetId ?? undefined,
                            chantierLibre: demande.chantierLibre ?? undefined,
                            lieuLivraisonProjetId: demande.lieuLivraisonProjetId ?? undefined,
                            lieuLivraisonLibre: demande.lieuLivraisonLibre ?? undefined,
                            dateLivraisonSouhaitee: demande.dateLivraisonSouhaitee
                              .toISOString()
                              .slice(0, 10),
                            justification: demande.justification,
                            lignes: demande.lignes.map((ligne) => ({
                              articleId: ligne.articleId ?? undefined,
                              designationLibre: ligne.designationLibre ?? undefined,
                              quantite: ligne.quantite,
                            })),
                          }}
                        />
                      )}
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
