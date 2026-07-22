import type { StatutDemandeMateriel } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerDemandesMateriel, listerMateriels } from "@/lib/server-actions/demande-materiel";
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
import { DemandeMaterielForm } from "@/components/direction-technique/demande-materiel-form";
import { DemandeMaterielActions } from "@/components/direction-technique/demande-materiel-actions";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_LOGISTIQUE: "En attente Logistique",
  VALIDEE: "Validée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_LOGISTIQUE: "attention",
  VALIDEE: "succes",
  REFUSEE: "danger",
};

interface DemandeLogistiquePageProps {
  searchParams: Promise<{ statut?: string }>;
}

export default async function DemandeLogistiquePage({ searchParams }: DemandeLogistiquePageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "demande-logistique");

  const { statut: statutFiltre } = await searchParams;
  const estResponsableLogistique = await possedeAccesSousModule(utilisateur.id, "logistique", "magasins");

  const [demandes, materiels, projets] = await Promise.all([
    listerDemandesMateriel(
      statutFiltre && statutFiltre in LABEL_STATUT ? (statutFiltre as StatutDemandeMateriel) : undefined,
    ),
    listerMateriels(),
    prisma.projet.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  const enAttente = demandes.filter((d) => d.statut === "EN_ATTENTE_LOGISTIQUE");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demande de ressources logistiques"
        description="Matériel emprunté auprès du Service Logistique."
        actions={<DemandeMaterielForm projets={projets} materiels={materiels} />}
      />

      {estResponsableLogistique && enAttente.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À valider</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matériel</TableHead>
                  <TableHead>Projet / chantier</TableHead>
                  <TableHead>Délai souhaité</TableHead>
                  <TableHead>Initiateur</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enAttente.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.materiel.designation}</TableCell>
                    <TableCell>{demande.projet?.nom ?? demande.chantierLibre ?? "—"}</TableCell>
                    <TableCell>{demande.delaiSouhaite.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {demande.initiateur.prenom} {demande.initiateur.nom}
                    </TableCell>
                    <TableCell>
                      <DemandeMaterielActions demandeId={demande.id} />
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

      {demandes.length === 0 ? (
        <EmptyState
          title="Aucune demande de matériel"
          description="Aucune Fonction n'a encore accès à la validation Logistique (Lot 6 à venir) — les demandes créées resteront en attente jusque-là."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matériel</TableHead>
                  <TableHead>Projet / chantier</TableHead>
                  <TableHead>Délai souhaité</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">{demande.materiel.designation}</TableCell>
                    <TableCell>{demande.projet?.nom ?? demande.chantierLibre ?? "—"}</TableCell>
                    <TableCell>{demande.delaiSouhaite.toLocaleDateString("fr-FR")}</TableCell>
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
