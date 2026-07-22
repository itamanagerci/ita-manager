import Link from "next/link";
import {
  requireAccesFluxSortieQuelconque,
  listerDemandesMiseADisposition,
  listerAVerifierDMS,
  listerADeciderDMS,
} from "@/lib/server-actions/flux-sortie";
import { listerMagasins } from "@/lib/server-actions/fiche-inventaire";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemandeMiseADispositionForm } from "@/components/logistique/demande-mise-a-disposition-form";
import { VerificationDMSActions } from "@/components/logistique/verification-dms-actions";
import { DecisionDMSActions } from "@/components/logistique/decision-dms-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_VERIFICATION: "En attente de vérification",
  EN_ATTENTE_DECISION: "En attente de décision",
  APPROUVEE: "Approuvée",
  TRANSFERT_INTER_MAGASIN: "Transfert inter-magasin",
  DEMANDE_ACHAT_DECLENCHEE: "Demande d'achat déclenchée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_VERIFICATION: "attention",
  EN_ATTENTE_DECISION: "attention",
  APPROUVEE: "succes",
  TRANSFERT_INTER_MAGASIN: "succes",
  DEMANDE_ACHAT_DECLENCHEE: "attention",
  REFUSEE: "danger",
};

export default async function FluxSortiePage() {
  const { peutDemander, estResponsableMagasin, peutDecider } = await requireAccesFluxSortieQuelconque();

  const [demandes, aVerifier, aDecider, magasins, materiels] = await Promise.all([
    listerDemandesMiseADisposition(),
    estResponsableMagasin ? listerAVerifierDMS() : Promise.resolve([]),
    peutDecider ? listerADeciderDMS() : Promise.resolve([]),
    listerMagasins(),
    peutDemander
      ? prisma.materiel.findMany({
          where: { magasinId: { not: null } },
          select: { id: true, designation: true },
          orderBy: { designation: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flux Sortie Stock"
        description="Demande de Mise à Disposition Stock (DMS) et Bon de Sortie Magasin (BSM)."
        actions={
          peutDemander ? (
            <DemandeMiseADispositionForm magasins={magasins} materiels={materiels} />
          ) : undefined
        }
      />

      {estResponsableMagasin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À vérifier (Chef Magasin)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aVerifier.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à vérifier" bordered={false} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Chantier/service</TableHead>
                    <TableHead>Urgence</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aVerifier.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">
                        DMS-{String(demande.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{demande.chantierService}</TableCell>
                      <TableCell>
                        {demande.urgence === "URGENT" ? (
                          <StatutBadge label="Urgent" tonalite="danger" />
                        ) : (
                          <StatutBadge label="Normal" tonalite="neutre" />
                        )}
                      </TableCell>
                      <TableCell>
                        {demande.demandeur.prenom} {demande.demandeur.nom}
                      </TableCell>
                      <TableCell>
                        <VerificationDMSActions demandeId={demande.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {peutDecider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À décider (Logisticien)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aDecider.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à décider" bordered={false} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Magasin</TableHead>
                    <TableHead>Chantier/service</TableHead>
                    <TableHead>Vérification</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aDecider.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">
                        DMS-{String(demande.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{demande.magasin.code}</TableCell>
                      <TableCell>{demande.chantierService}</TableCell>
                      <TableCell>{demande.verificationStatut ?? "—"}</TableCell>
                      <TableCell>
                        <DecisionDMSActions
                          demandeId={demande.id}
                          magasinSourceId={demande.magasinId}
                          magasins={magasins}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {demandes.length === 0 ? (
        <EmptyState
          title="Aucune demande de mise à disposition"
          description="Les demandes soumises apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Chantier/service</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      DMS-{String(demande.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>{demande.magasin.code}</TableCell>
                    <TableCell>{demande.chantierService}</TableCell>
                    <TableCell>
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[demande.statut]}
                        tonalite={TONALITE_STATUT[demande.statut]}
                      />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/logistique/flux-sortie/${demande.id}`}>Voir le détail</Link>
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
