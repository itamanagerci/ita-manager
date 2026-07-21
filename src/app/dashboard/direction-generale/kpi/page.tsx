import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { getModulesMetier } from "@/lib/server-actions/demande-index";
import { tonaliteDepuisStatutLibelle } from "@/lib/demande-index-tonalite";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDelai(millisecondes: number): string {
  const jours = millisecondes / (1000 * 60 * 60 * 24);
  return jours < 1 ? "< 1 j" : `${jours.toFixed(1)} j`;
}

export default async function KpiPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-generale", "kpi");

  const modulesMetier = await getModulesMetier();

  const [resolues, enAttenteParModule] = await Promise.all([
    prisma.demandeIndex.findMany({
      where: { enAttenteValidationDe: null, enAttenteValidationUtilisateurId: null },
      select: { typeModule: true, statutLibelle: true, montant: true, dateSoumission: true, dateMaj: true },
    }),
    prisma.demandeIndex.groupBy({
      by: ["typeModule"],
      where: {
        OR: [{ enAttenteValidationDe: { not: null } }, { enAttenteValidationUtilisateurId: { not: null } }],
      },
      _count: { _all: true },
    }),
  ]);

  const enAttenteParModuleMap = new Map(enAttenteParModule.map((l) => [l.typeModule, l._count._all]));
  const traiteParModuleMap = new Map<string, number>();
  for (const demande of resolues) {
    traiteParModuleMap.set(demande.typeModule, (traiteParModuleMap.get(demande.typeModule) ?? 0) + 1);
  }

  const delaiMoyenMs =
    resolues.length === 0
      ? null
      : resolues.reduce((total, d) => total + (d.dateMaj.getTime() - d.dateSoumission.getTime()), 0) /
        resolues.length;

  const montantValide = resolues
    .filter((d) => d.montant != null && tonaliteDepuisStatutLibelle(d.statutLibelle) === "succes")
    .reduce((total, d) => total + Number(d.montant), 0);

  const totalEnAttente = enAttenteParModule.reduce((total, l) => total + l._count._all, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="KPI"
        description="Indicateurs calculés automatiquement à partir des demandes de tous les modules."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Demandes en attente</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">{totalEnAttente}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Demandes traitées</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">{resolues.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Délai moyen de validation</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">
            {delaiMoyenMs === null ? "—" : formatDelai(delaiMoyenMs)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Montant total validé</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-foreground">
            {montantValide.toLocaleString("fr-FR")} FCFA
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulesMetier.map((module) => (
          <Card key={module.code}>
            <CardHeader>
              <CardTitle className="text-base">{module.nom}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                En attente : <span className="font-medium text-foreground">{enAttenteParModuleMap.get(module.code) ?? 0}</span>
              </span>
              <span className="text-muted-foreground">
                Traitées : <span className="font-medium text-foreground">{traiteParModuleMap.get(module.code) ?? 0}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
