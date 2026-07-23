import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerBonsDeCommandePayables } from "@/lib/server-actions/achat-bons-commande";
import {
  listerFacturesAPayer,
  listerMissionsPayables,
  listerPaiementsEffectues,
} from "@/lib/server-actions/dfc-paiements";
import { listerFournisseurs } from "@/lib/server-actions/dfc-fournisseurs";
import { PageHeader } from "@/components/ui/composed/page-header";
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
import { FactureForm } from "@/components/dfc/facture-form";
import { PaiementFactureForm } from "@/components/dfc/paiement-facture-form";
import { PaiementMissionForm } from "@/components/dfc/paiement-mission-form";
import { FournisseurWaveForm } from "@/components/dfc/fournisseur-wave-form";

const LABEL_MODE: Record<string, string> = {
  CHEQUE: "Chèque",
  VIREMENT: "Virement",
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
};

export default async function PaiementStandardPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "dfc", "paiement-standard");

  const [bonsPayables, facturesAPayer, missionsPayables, fournisseurs, paiements] = await Promise.all([
    listerBonsDeCommandePayables(),
    listerFacturesAPayer(),
    listerMissionsPayables(),
    listerFournisseurs(),
    listerPaiementsEffectues(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Paiement standard"
        description="Facturation et paiement des Bons de Commande reçus, et des frais de mission validés."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bons de Commande à facturer / payer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bonsPayables.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucun Bon de Commande en attente"
                description="Un BC apparaît ici une fois envoyé et sa réception confirmée par le Logisticien."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Mode / Échéance</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonsPayables.map((bc) => {
                  const premiereDemande = bc.lignes[0]?.ligneDemandeAchat.demande;
                  return (
                    <TableRow key={bc.id}>
                      <TableCell className="font-medium">
                        BC-{String(bc.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{bc.fournisseur}</TableCell>
                      <TableCell>
                        {premiereDemande?.typePaiement ? LABEL_MODE[premiereDemande.typePaiement] : "—"}
                        {premiereDemande?.echeancePaiementJours
                          ? ` — ${premiereDemande.echeancePaiementJours} jours`
                          : ""}
                      </TableCell>
                      <TableCell>
                        <FactureForm bonDeCommandeId={bc.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Factures enregistrées — à payer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {facturesAPayer.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune facture en attente de paiement" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° BC</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Référence facture</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturesAPayer.map((facture) => {
                  const premiereDemande = facture.bonDeCommande.lignes[0]?.ligneDemandeAchat.demande;
                  return (
                    <TableRow key={facture.id}>
                      <TableCell className="font-medium">
                        BC-{String(facture.bonDeCommande.numero).padStart(5, "0")}
                      </TableCell>
                      <TableCell>{facture.bonDeCommande.fournisseur}</TableCell>
                      <TableCell>{facture.referenceFournisseur}</TableCell>
                      <TableCell>{Number(facture.montant).toLocaleString("fr-FR")} F CFA</TableCell>
                      <TableCell>
                        <PaiementFactureForm
                          factureId={facture.id}
                          modeDefaut={premiereDemande?.typePaiement ?? null}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frais de mission validés à payer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {missionsPayables.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun frais de mission en attente" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Frais déclarés</TableHead>
                  <TableHead className="w-56" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {missionsPayables.map((mission) => (
                  <TableRow key={mission.id}>
                    <TableCell className="font-medium">
                      {mission.employeConcerne.prenom} {mission.employeConcerne.nom}
                    </TableCell>
                    <TableCell>{mission.motifFrais ?? "—"}</TableCell>
                    <TableCell>{Number(mission.fraisDeclares).toLocaleString("fr-FR")} F CFA</TableCell>
                    <TableCell>
                      <PaiementMissionForm demandeMissionId={mission.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fournisseurs — numéro Wave</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fournisseurs.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun fournisseur référencé" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Numéro Wave</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fournisseurs.map((fournisseur) => (
                  <TableRow key={fournisseur.id}>
                    <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                    <TableCell>
                      <FournisseurWaveForm
                        fournisseurId={fournisseur.id}
                        numeroWaveInitial={fournisseur.numeroWave}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paiements effectués</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paiements.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun paiement" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paiements.map((paiement) => (
                  <TableRow key={paiement.id}>
                    <TableCell>
                      {paiement.facture
                        ? `BC-${String(paiement.facture.bonDeCommande.numero).padStart(5, "0")} (${paiement.facture.bonDeCommande.fournisseur})`
                        : paiement.demandeMission
                          ? `${paiement.demandeMission.employeConcerne.prenom} ${paiement.demandeMission.employeConcerne.nom} (mission)`
                          : "—"}
                    </TableCell>
                    <TableCell>{Number(paiement.montant).toLocaleString("fr-FR")} F CFA</TableCell>
                    <TableCell>{LABEL_MODE[paiement.mode]}</TableCell>
                    <TableCell>{paiement.dateExecution.toLocaleDateString("fr-FR")}</TableCell>
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
