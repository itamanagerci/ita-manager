import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { getModulesMetier } from "@/lib/server-actions/demande-index";
import { tonaliteDepuisStatutLibelle } from "@/lib/demande-index-tonalite";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuiviPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-generale", "suivi");

  const modulesMetier = await getModulesMetier();

  const repartition = await prisma.demandeIndex.groupBy({
    by: ["typeModule", "statutLibelle"],
    _count: { _all: true },
  });

  const parModule = new Map<string, { statutLibelle: string; count: number }[]>();
  for (const ligne of repartition) {
    const entree = parModule.get(ligne.typeModule) ?? [];
    entree.push({ statutLibelle: ligne.statutLibelle, count: ligne._count._all });
    parModule.set(ligne.typeModule, entree);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi"
        description="Vue d'ensemble de l'état d'avancement de l'entreprise, tous modules confondus."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulesMetier.map((module) => {
          const statuts = parModule.get(module.code) ?? [];
          return (
            <Card key={module.code}>
              <CardHeader>
                <CardTitle className="text-base">{module.nom}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {statuts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée pour ce module</p>
                ) : (
                  statuts.map((statut) => (
                    <div key={statut.statutLibelle} className="flex items-center justify-between">
                      <StatutBadge
                        label={statut.statutLibelle}
                        tonalite={tonaliteDepuisStatutLibelle(statut.statutLibelle)}
                      />
                      <span className="text-sm font-medium text-foreground">{statut.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projets/chantiers actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <StatutBadge label="Disponible après le Lot Direction Technique" tonalite="neutre" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
