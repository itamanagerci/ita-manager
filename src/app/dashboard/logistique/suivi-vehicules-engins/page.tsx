import Link from "next/link";
import { listerVehiculesComplet } from "@/lib/server-actions/vehicules";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VehiculeForm } from "@/components/logistique/vehicule-form";

const LABEL_ETAT: Record<string, string> = { OK: "OK", PANNE: "Panne", HORS_SERVICE: "Hors service" };
const TONALITE_ETAT: Record<string, Tonalite> = { OK: "succes", PANNE: "attention", HORS_SERVICE: "danger" };
const LABEL_TYPE: Record<string, string> = { LEGER: "Léger", LOURD: "Lourd (PL)", ENGIN: "Engin" };

export default async function SuiviVehiculesEnginsPage() {
  const vehicules = await listerVehiculesComplet();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi Véhicules & Engins"
        description="Fiche de suivi permanente de l'affectation, de la localisation et de l'état."
        actions={<VehiculeForm />}
      />

      {vehicules.length === 0 ? (
        <EmptyState title="Aucun véhicule" description="Créez le premier véhicule avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Marque/Modèle</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Affectation</TableHead>
                  <TableHead>Compteur</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicules.map((vehicule) => (
                  <TableRow key={vehicule.id}>
                    <TableCell className="font-medium">{vehicule.immatriculation}</TableCell>
                    <TableCell>{LABEL_TYPE[vehicule.type]}</TableCell>
                    <TableCell>
                      {vehicule.marque} {vehicule.modele}
                    </TableCell>
                    <TableCell>
                      <StatutBadge label={LABEL_ETAT[vehicule.etat]} tonalite={TONALITE_ETAT[vehicule.etat]} />
                    </TableCell>
                    <TableCell>
                      {vehicule.chauffeurActuel
                        ? `${vehicule.chauffeurActuel.prenom} ${vehicule.chauffeurActuel.nom}`
                        : "—"}
                      {vehicule.chantierActuel ? ` — ${vehicule.chantierActuel}` : ""}
                    </TableCell>
                    <TableCell>{vehicule.compteurActuel ?? "—"}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/logistique/suivi-vehicules-engins/${vehicule.id}`}>
                          Détail
                        </Link>
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
