import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { peutValiderRH } from "@/lib/server-actions/rh-partage";
import { listerAValiderReleves, listerReleves } from "@/lib/server-actions/rh-releves";
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
import { ReleveForm } from "@/components/rh/releve-form";
import { ReleveActions } from "@/components/rh/releve-actions";

const LABEL_STATUT: Record<string, string> = {
  SOUMIS: "Soumis",
  VALIDE_RH: "Validé",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  SOUMIS: "attention",
  VALIDE_RH: "succes",
};

export default async function ReleveActivitePage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "rh", "releve-activite");

  const estRH = await peutValiderRH(utilisateur.id);

  const [aValider, tous, ouvriers] = await Promise.all([
    listerAValiderReleves(),
    listerReleves(),
    prisma.utilisateur.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relevé d'activité"
        description="Saisie des jours travaillés par les ouvriers, validée par les Ressources Humaines."
        actions={<ReleveForm ouvriers={ouvriers} />}
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
                  <TableHead>Ouvrier</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Saisi par</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aValider.map((releve) => (
                  <TableRow key={releve.id}>
                    <TableCell className="font-medium">
                      {releve.ouvrier.prenom} {releve.ouvrier.nom}
                    </TableCell>
                    <TableCell>{releve.projetLibelle}</TableCell>
                    <TableCell>{releve.periode}</TableCell>
                    <TableCell>{releve.joursTravailles}</TableCell>
                    <TableCell>
                      {releve.saisiPar.prenom} {releve.saisiPar.nom}
                    </TableCell>
                    <TableCell>
                      <ReleveActions releveId={releve.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tous.length === 0 ? (
        <EmptyState
          title="Aucun relevé pour le moment"
          description="Alimenté automatiquement une fois le Lot Direction Technique construit — en attendant, la saisie manuelle ci-dessus reste disponible."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ouvrier</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tous.map((releve) => (
                  <TableRow key={releve.id}>
                    <TableCell className="font-medium">
                      {releve.ouvrier.prenom} {releve.ouvrier.nom}
                    </TableCell>
                    <TableCell>{releve.projetLibelle}</TableCell>
                    <TableCell>{releve.periode}</TableCell>
                    <TableCell>{releve.joursTravailles}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[releve.statut]}
                        tonalite={TONALITE_STATUT[releve.statut]}
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
