import type { StatutDemandeCarburant } from "@prisma/client";
import {
  requireAccesCarburantQuelconque,
  listerDemandesAValider,
  listerDemandesCarburant,
  listerVehicules,
  listerDepots,
} from "@/lib/server-actions/carburant";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NouvelleDemandeForm } from "@/components/carburant/nouvelle-demande-form";
import { DemandeActions } from "@/components/carburant/demande-actions";

const LABEL_STATUT: Record<StatutDemandeCarburant, string> = {
  EN_ATTENTE_LOGISTIQUE: "En attente Logistique",
  EN_ATTENTE_DG: "En attente DG",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<StatutDemandeCarburant, Tonalite> = {
  EN_ATTENTE_LOGISTIQUE: "attention",
  EN_ATTENTE_DG: "attention",
  VALIDEE: "succes",
  REFUSEE: "danger",
};

interface DemandeCarburantPageProps {
  searchParams: Promise<{ statut?: string }>;
}

export default async function DemandeCarburantPage({ searchParams }: DemandeCarburantPageProps) {
  const { peutDemander, peutLogistique, peutDG } = await requireAccesCarburantQuelconque();

  const { statut: statutFiltre } = await searchParams;

  const [demandesAValider, demandesToutes, vehicules, depots] = await Promise.all([
    listerDemandesAValider(),
    listerDemandesCarburant(
      statutFiltre && statutFiltre in LABEL_STATUT
        ? (statutFiltre as StatutDemandeCarburant)
        : undefined,
    ),
    peutDemander ? listerVehicules() : Promise.resolve([]),
    peutDemander ? listerDepots() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demande de carburant"
        description="Suivi des demandes de carburant par véhicule."
        actions={
          peutDemander ? (
            <NouvelleDemandeForm
              vehicules={vehicules.map((v) => ({ id: v.id, immatriculation: v.immatriculation }))}
              depots={depots.map((d) => ({ id: d.id, nom: d.nom }))}
            />
          ) : undefined
        }
      />

      {(peutLogistique || peutDG) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {demandesAValider.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à valider" description="Aucune demande en attente pour vous." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Dépôt</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Chantier/mission</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandesAValider.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">
                        {demande.vehicule.immatriculation}
                      </TableCell>
                      <TableCell>{demande.depotSource.nom}</TableCell>
                      <TableCell>
                        {demande.quantiteDemandeeLitres.toLocaleString("fr-FR")} L
                      </TableCell>
                      <TableCell>{demande.chantierMission}</TableCell>
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
                        <DemandeActions demandeId={demande.id} statut={demande.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <form method="GET" className="flex items-center gap-2">
        <NativeSelect name="statut" defaultValue={statutFiltre ?? ""} className="w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(LABEL_STATUT).map(([valeur, label]) => (
            <option key={valeur} value={valeur}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      {demandesToutes.length === 0 ? (
        <EmptyState
          title="Aucune demande de carburant"
          description="Les demandes soumises apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead>Kilométrage</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Chantier/mission</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandesToutes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      {demande.vehicule.immatriculation}
                    </TableCell>
                    <TableCell>{demande.depotSource.nom}</TableCell>
                    <TableCell>{demande.kilometrageCompteur.toLocaleString("fr-FR")} km</TableCell>
                    <TableCell>{demande.quantiteDemandeeLitres.toLocaleString("fr-FR")} L</TableCell>
                    <TableCell>{demande.chantierMission}</TableCell>
                    <TableCell>
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
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
