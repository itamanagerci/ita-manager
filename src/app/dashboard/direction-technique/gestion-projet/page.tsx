import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerProjets } from "@/lib/server-actions/gestion-projet";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjetForm } from "@/components/direction-technique/projet-form";

export default async function GestionProjetPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "gestion-projet");

  const [projets, utilisateurs] = await Promise.all([
    listerProjets(),
    prisma.utilisateur.findMany({
      where: { statut: "ACTIF" },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion de projet"
        description="Projets et points de validation."
        actions={<ProjetForm utilisateurs={utilisateurs} />}
      />

      {projets.length === 0 ? (
        <EmptyState title="Aucun projet" description="Créez le premier projet avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Chef de projet</TableHead>
                  <TableHead>Date de début</TableHead>
                  <TableHead>Points de validation</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projets.map((projet) => {
                  const restants = projet.pointsValidation.filter((p) => p.statut === "A_FAIRE").length;
                  return (
                    <TableRow key={projet.id}>
                      <TableCell className="font-medium">{projet.nom}</TableCell>
                      <TableCell>
                        {projet.chefProjet.prenom} {projet.chefProjet.nom}
                      </TableCell>
                      <TableCell>{projet.dateDebut.toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {restants} à faire / {projet.pointsValidation.length}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/direction-technique/gestion-projet/${projet.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Voir le détail
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
