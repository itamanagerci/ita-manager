import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
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
import { CreerCompteForm } from "@/components/gestion-comptes/creer-compte-form";
import { UtilisateurRowActions } from "@/components/gestion-comptes/utilisateur-row-actions";

const LABEL_NIVEAU: Record<string, string> = {
  DIRECTEUR: "Directeur",
  CHEF_SERVICE: "Chef de service",
  AGENT: "Agent",
};

export default async function GestionComptesAccesPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "authentification-roles", "gestion-comptes-acces");

  const [utilisateurs, fonctions] = await Promise.all([
    prisma.utilisateur.findMany({
      include: { fonction: true },
      orderBy: { dateCreation: "desc" },
    }),
    prisma.fonction.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestion des comptes et des accès"
        description="Création, suspension, suppression et gestion fine des accès individuels."
        actions={<CreerCompteForm fonctions={fonctions} />}
      />

      <Card>
        <CardContent className="p-0">
          {utilisateurs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucun compte"
                description="Créez le premier compte utilisateur avec le bouton ci-dessus."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fonction</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilisateurs.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.prenom} {u.nom}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.fonction.nom}</TableCell>
                    <TableCell>{LABEL_NIVEAU[u.niveauHierarchique]}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={u.statut === "ACTIF" ? "Actif" : "Inactif"}
                        tonalite={u.statut === "ACTIF" ? "succes" : "attention"}
                      />
                    </TableCell>
                    <TableCell>{u.dateCreation.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <UtilisateurRowActions
                        utilisateurId={u.id}
                        nomComplet={`${u.prenom} ${u.nom}`}
                        statut={u.statut}
                      />
                    </TableCell>
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
