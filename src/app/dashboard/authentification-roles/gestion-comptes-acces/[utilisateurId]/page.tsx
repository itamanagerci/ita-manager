import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FonctionNiveauForm } from "@/components/gestion-comptes/fonction-niveau-form";
import { AccesIndividuelsForm } from "@/components/gestion-comptes/acces-individuels-form";
import { ProfilRHForm } from "@/components/rh/profil-rh-form";

const LABEL_TYPE_PROFIL: Record<string, string> = {
  AGENT: "Agent",
  SOUS_TRAITANT: "Sous-traitant",
  OUVRIER: "Ouvrier",
};

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

  const [cible, fonctions, modules, accesActuel, peutGererProfilsRH, utilisateursActifs] =
    await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: utilisateurId },
        include: {
          fonction: true,
          creePar: { select: { nom: true, prenom: true } },
          profilEmploye: true,
        },
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
      possedeAccesSousModule(utilisateurCourant.id, "rh", "creation-profil"),
      prisma.utilisateur.findMany({
        where: { statut: "ACTIF" },
        select: { id: true, nom: true, prenom: true },
        orderBy: { nom: "asc" },
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

      {(peutGererProfilsRH || cible.profilEmploye) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil RH</CardTitle>
          </CardHeader>
          <CardContent>
            {peutGererProfilsRH ? (
              <ProfilRHForm
                utilisateurId={cible.id}
                profilExistant={
                  cible.profilEmploye
                    ? {
                        typeProfil: cible.profilEmploye.typeProfil,
                        poste: cible.profilEmploye.poste,
                        service: cible.profilEmploye.service,
                        dateEntree: cible.profilEmploye.dateEntree,
                        soldeConges: cible.profilEmploye.soldeConges,
                        salaireFixe: cible.profilEmploye.salaireFixe
                          ? Number(cible.profilEmploye.salaireFixe)
                          : null,
                        entrepriseRattachee: cible.profilEmploye.entrepriseRattachee,
                        tauxJournalier: cible.profilEmploye.tauxJournalier
                          ? Number(cible.profilEmploye.tauxJournalier)
                          : null,
                      }
                    : null
                }
                superieurActuelId={cible.superieurId}
                numeroWaveActuel={cible.numeroWave}
                utilisateursDisponibles={utilisateursActifs}
              />
            ) : cible.profilEmploye ? (
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {LABEL_TYPE_PROFIL[cible.profilEmploye.typeProfil]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Poste</p>
                  <p className="font-medium">{cible.profilEmploye.poste}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p className="font-medium">{cible.profilEmploye.service}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date d&apos;entrée</p>
                  <p className="font-medium">
                    {cible.profilEmploye.dateEntree.toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solde de congés</p>
                  <p className="font-medium">{cible.profilEmploye.soldeConges} jours</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
