import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FonctionNiveauForm } from "@/components/gestion-comptes/fonction-niveau-form";
import { AccesIndividuelsForm } from "@/components/gestion-comptes/acces-individuels-form";

const LABEL_NIVEAU: Record<string, string> = {
  DIRECTEUR: "Directeur",
  CHEF_SERVICE: "Chef de service",
  AGENT: "Agent",
};

interface DetailUtilisateurPageProps {
  params: Promise<{ utilisateurId: string }>;
}

export default async function DetailUtilisateurPage({ params }: DetailUtilisateurPageProps) {
  const utilisateurCourant = await getCurrentUtilisateur();
  if (!utilisateurCourant) redirect("/login");

  await requireAccesModule(
    utilisateurCourant.id,
    "authentification-roles",
    "gestion-comptes-acces",
  );

  const { utilisateurId } = await params;

  const [cible, fonctions, modules, accesActuel] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: { fonction: true, creePar: { select: { nom: true, prenom: true } } },
    }),
    prisma.fonction.findMany({ where: { actif: true }, orderBy: { nom: "asc" } }),
    prisma.module.findMany({
      orderBy: { ordre: "asc" },
      include: { sousModules: { where: { actif: true }, orderBy: { ordre: "asc" } } },
    }),
    prisma.accesUtilisateur.findMany({
      where: { utilisateurId, actif: true },
      select: { sousModuleId: true },
    }),
  ]);

  if (!cible) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${cible.prenom} ${cible.nom}`}
        description={cible.email}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Nom complet</p>
            <p className="font-medium">
              {cible.prenom} {cible.nom}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{cible.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Téléphone</p>
            <p className="font-medium">{cible.telephone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <StatutBadge
              label={cible.statut === "ACTIF" ? "Actif" : "Inactif"}
              tonalite={cible.statut === "ACTIF" ? "succes" : "attention"}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fonction actuelle</p>
            <p className="font-medium">{cible.fonction.nom}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Niveau hiérarchique</p>
            <p className="font-medium">{LABEL_NIVEAU[cible.niveauHierarchique]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créé le</p>
            <p className="font-medium">{cible.dateCreation.toLocaleDateString("fr-FR")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créé par</p>
            <p className="font-medium">
              {cible.creePar
                ? `${cible.creePar.prenom} ${cible.creePar.nom}`
                : cible.creeParId
                  ? "Compte depuis supprimé"
                  : "Compte initial (sans créateur)"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dernière modification</p>
            <p className="font-medium">{cible.dateModification.toLocaleDateString("fr-FR")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fonction et niveau hiérarchique</CardTitle>
        </CardHeader>
        <CardContent>
          <FonctionNiveauForm
            utilisateurId={cible.id}
            fonctionActuelleId={cible.fonctionId}
            niveauActuel={cible.niveauHierarchique}
            fonctions={fonctions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès individuels</CardTitle>
        </CardHeader>
        <CardContent>
          <AccesIndividuelsForm
            utilisateurId={cible.id}
            modules={modules.filter((m) => m.sousModules.length > 0)}
            sousModuleIdsActifsInitial={accesActuel.map((a) => a.sousModuleId)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
