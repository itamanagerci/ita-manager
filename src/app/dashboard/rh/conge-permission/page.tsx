import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { peutValiderRH } from "@/lib/server-actions/rh-partage";
import {
  listerAValiderAbsences,
  listerMesAbsences,
  listerToutesAbsencesRH,
} from "@/lib/server-actions/rh-absences";
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
import { AbsenceForm } from "@/components/rh/absence-form";
import { AbsenceActions } from "@/components/rh/absence-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_SUPERIEUR: "En attente du supérieur",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_SUPERIEUR: "attention",
  VALIDEE: "succes",
  REFUSEE: "danger",
};

const LABEL_TYPE: Record<string, string> = {
  CONGE: "Congé",
  PERMISSION: "Permission",
};

export default async function CongePermissionPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "rh", "conge-permission");

  const estRH = await peutValiderRH(utilisateur.id);

  const [aValider, mesDemandes, toutes] = await Promise.all([
    listerAValiderAbsences(),
    listerMesAbsences(),
    estRH ? listerToutesAbsencesRH() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Congés / permissions"
        description="Soumission et validation des demandes d'absence."
        actions={<AbsenceForm />}
      />

      {aValider.length > 0 && (
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
                  <TableHead>Période</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValider.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">
                      {demande.employe.prenom} {demande.employe.nom}
                    </TableCell>
                    <TableCell>{LABEL_TYPE[demande.type]}</TableCell>
                    <TableCell>
                      {demande.type === "CONGE"
                        ? `${demande.dateDebut.toLocaleDateString("fr-FR")} — ${demande.dateFin?.toLocaleDateString("fr-FR")}`
                        : `${demande.dateDebut.toLocaleDateString("fr-FR")} (${demande.dureeHeures}h)`}
                    </TableCell>
                    <TableCell>{demande.motif}</TableCell>
                    <TableCell>
                      <AbsenceActions demandeId={demande.id} />
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
                description="Vos demandes de congé/permission apparaîtront ici."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Soumise le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mesDemandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{LABEL_TYPE[demande.type]}</TableCell>
                    <TableCell>
                      {demande.type === "CONGE"
                        ? `${demande.dateDebut.toLocaleDateString("fr-FR")} — ${demande.dateFin?.toLocaleDateString("fr-FR")}`
                        : `${demande.dateDebut.toLocaleDateString("fr-FR")} (${demande.dureeHeures}h)`}
                    </TableCell>
                    <TableCell>{demande.motif}</TableCell>
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
          )}
        </CardContent>
      </Card>

      {estRH && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toutes les demandes (RH)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {toutes.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Aucune demande" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Supérieur</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toutes.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">
                        {demande.employe.prenom} {demande.employe.nom}
                      </TableCell>
                      <TableCell>{LABEL_TYPE[demande.type]}</TableCell>
                      <TableCell>
                        {demande.type === "CONGE"
                          ? `${demande.dateDebut.toLocaleDateString("fr-FR")} — ${demande.dateFin?.toLocaleDateString("fr-FR")}`
                          : `${demande.dateDebut.toLocaleDateString("fr-FR")} (${demande.dureeHeures}h)`}
                      </TableCell>
                      <TableCell>
                        {demande.superieur.prenom} {demande.superieur.nom}
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
