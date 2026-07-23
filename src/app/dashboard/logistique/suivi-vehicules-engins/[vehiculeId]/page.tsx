import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerHistoriqueMouvements } from "@/lib/server-actions/vehicules";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChangementEtatForm } from "@/components/logistique/changement-etat-form";
import { ChangementAffectationForm } from "@/components/logistique/changement-affectation-form";
import { SortieDefinitiveForm } from "@/components/logistique/sortie-definitive-form";

const LABEL_ETAT: Record<string, string> = { OK: "OK", PANNE: "Panne", HORS_SERVICE: "Hors service" };
const TONALITE_ETAT: Record<string, Tonalite> = { OK: "succes", PANNE: "attention", HORS_SERVICE: "danger" };

interface VehiculeDetailPageProps {
  params: Promise<{ vehiculeId: string }>;
}

export default async function VehiculeDetailPage({ params }: VehiculeDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "suivi-vehicules-engins");

  const { vehiculeId } = await params;

  const [vehicule, historique, chauffeurs] = await Promise.all([
    prisma.vehicule.findUnique({ where: { id: vehiculeId }, include: { chauffeurActuel: true } }),
    listerHistoriqueMouvements(vehiculeId),
    prisma.utilisateur.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
  ]);
  if (!vehicule) redirect("/dashboard/logistique/suivi-vehicules-engins");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={vehicule.immatriculation}
        description={`${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim() || undefined}
        actions={
          !vehicule.dateSortieDefinitive ? (
            <div className="flex items-center gap-2">
              <ChangementEtatForm vehiculeId={vehicule.id} etatActuel={vehicule.etat} />
              <ChangementAffectationForm
                vehiculeId={vehicule.id}
                chantierActuel={vehicule.chantierActuel}
                chauffeurs={chauffeurs}
              />
              <SortieDefinitiveForm vehiculeId={vehicule.id} />
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fiche</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            État : <StatutBadge label={LABEL_ETAT[vehicule.etat]} tonalite={TONALITE_ETAT[vehicule.etat]} />
          </p>
          <p>
            Affectation :{" "}
            {vehicule.chauffeurActuel
              ? `${vehicule.chauffeurActuel.prenom} ${vehicule.chauffeurActuel.nom}`
              : "Aucun chauffeur"}
            {vehicule.chantierActuel ? ` — ${vehicule.chantierActuel}` : ""}
          </p>
          <p>Compteur actuel : {vehicule.compteurActuel ?? "—"}</p>
          {vehicule.dateDerniereVerificationInventaire && (
            <p>
              Dernière vérification inventaire :{" "}
              {vehicule.dateDerniereVerificationInventaire.toLocaleDateString("fr-FR")} —{" "}
              {vehicule.etatConstateDerniereVerification && LABEL_ETAT[vehicule.etatConstateDerniereVerification]}
            </p>
          )}
          {vehicule.dateSortieDefinitive && (
            <p className="font-semibold text-status-danger">
              Sorti définitivement le {vehicule.dateSortieDefinitive.toLocaleDateString("fr-FR")} —{" "}
              {vehicule.motifSortieDefinitive}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historique.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucun mouvement enregistré" bordered={false} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historique.map((mouvement) => (
                  <TableRow key={mouvement.id}>
                    <TableCell className="font-medium">{mouvement.type}</TableCell>
                    <TableCell>
                      {mouvement.etatAvant && mouvement.etatApres
                        ? `${LABEL_ETAT[mouvement.etatAvant]} → ${LABEL_ETAT[mouvement.etatApres]}`
                        : mouvement.chantierApres !== null
                          ? `${mouvement.chantierAvant ?? "—"} → ${mouvement.chantierApres ?? "—"}`
                          : (mouvement.commentaire ?? "—")}
                    </TableCell>
                    <TableCell>
                      {mouvement.effectuePar
                        ? `${mouvement.effectuePar.prenom} ${mouvement.effectuePar.nom}`
                        : "—"}
                    </TableCell>
                    <TableCell>{mouvement.date.toLocaleDateString("fr-FR")}</TableCell>
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
