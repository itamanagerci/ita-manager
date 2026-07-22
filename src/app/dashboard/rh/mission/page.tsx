import type { StatutMission } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { peutValiderRH } from "@/lib/server-actions/rh-partage";
import {
  listerAValiderMissions,
  listerDemandesMission,
} from "@/lib/server-actions/rh-missions";
import { prisma } from "@/lib/prisma";
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
import { MissionForm } from "@/components/rh/mission-form";
import { MissionActions } from "@/components/rh/mission-actions";

const LABEL_STATUT: Record<StatutMission, string> = {
  EN_ATTENTE_RH: "En attente RH",
  VALIDEE_RH: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<StatutMission, Tonalite> = {
  EN_ATTENTE_RH: "attention",
  VALIDEE_RH: "succes",
  REFUSEE: "danger",
};

interface MissionPageProps {
  searchParams: Promise<{ statut?: string }>;
}

export default async function MissionPage({ searchParams }: MissionPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "rh", "mission");

  const { statut: statutFiltre } = await searchParams;
  const estRH = await peutValiderRH(utilisateur.id);

  const [aValider, toutes, utilisateurs] = await Promise.all([
    listerAValiderMissions(),
    listerDemandesMission(
      statutFiltre && statutFiltre in LABEL_STATUT ? (statutFiltre as StatutMission) : undefined,
    ),
    prisma.utilisateur.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demandes de mission"
        description="Chantier, formation, représentation client..."
        actions={<MissionForm utilisateurCourantId={utilisateur.id} utilisateurs={utilisateurs} />}
      />

      {estRH && aValider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValider.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      {demande.employeConcerne.prenom} {demande.employeConcerne.nom}
                    </TableCell>
                    <TableCell>{demande.typeMission}</TableCell>
                    <TableCell>{demande.lieu}</TableCell>
                    <TableCell>
                      {demande.dateDebut.toLocaleDateString("fr-FR")} —{" "}
                      {demande.dateFin.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <MissionActions demandeId={demande.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      {toutes.length === 0 ? (
        <EmptyState
          title="Aucune demande de mission"
          description="Les demandes soumises apparaîtront ici."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Initiateur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toutes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      {demande.employeConcerne.prenom} {demande.employeConcerne.nom}
                    </TableCell>
                    <TableCell>
                      {demande.initiateur.prenom} {demande.initiateur.nom}
                    </TableCell>
                    <TableCell>{demande.typeMission}</TableCell>
                    <TableCell>{demande.lieu}</TableCell>
                    <TableCell>
                      {demande.dateDebut.toLocaleDateString("fr-FR")} —{" "}
                      {demande.dateFin.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[demande.statut]}
                        tonalite={TONALITE_STATUT[demande.statut]}
                      />
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
