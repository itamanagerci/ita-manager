import { PrismaClient } from "@prisma/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

/**
 * Client admin Supabase construit directement ici plutôt qu'importé depuis
 * lib/supabase/admin.ts : ce script tourne en Node.js pur via `tsx` (hors du
 * bundler Next.js), et lib/supabase/admin.ts importe `server-only`, qui lève
 * une erreur dès qu'il est chargé en dehors du build Next. La garde
 * `server-only` reste en place côté app — ce script s'en passe simplement.
 */
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

interface SousModuleSeed {
  code: string;
  nom: string;
  actif?: boolean;
}

interface ModuleSeed {
  code: string;
  nom: string;
  visibleMenu?: boolean;
  sousModules: SousModuleSeed[];
}

/**
 * Référentiel Module/SousModule — structure uniquement (noms/slugs), pas de
 * formulaires métier. "authentification-roles" est transversal (visibleMenu
 * = false) : jamais affiché dans le menu générique.
 */
const referentielModules: ModuleSeed[] = [
  {
    code: "authentification-roles",
    nom: "Authentification et Rôles",
    visibleMenu: false,
    sousModules: [{ code: "gestion-comptes-acces", nom: "Gestion des comptes et accès" }],
  },
  {
    code: "direction-generale",
    nom: "Direction Générale",
    sousModules: [
      { code: "validations-centralisees", nom: "Validations centralisées" },
      { code: "suivi", nom: "Suivi" },
      { code: "kpi", nom: "KPI" },
    ],
  },
  {
    code: "rh",
    nom: "Ressources Humaines",
    sousModules: [
      { code: "creation-profil", nom: "Création de profil employé" },
      { code: "conge-permission", nom: "Demande de congé / permission" },
      { code: "releve-activite", nom: "Relevé d'activité (ouvrier)" },
      { code: "pointage", nom: "Pointage présence employé", actif: false },
      { code: "mission", nom: "Demande de mission" },
    ],
  },
  {
    code: "dfc",
    nom: "Finances et Comptabilité",
    sousModules: [
      { code: "paiement-standard", nom: "Paiement standard" },
      { code: "paiement-urgent-wave", nom: "Paiement urgent quotidien (Wave)" },
    ],
  },
  {
    code: "direction-technique",
    nom: "Direction Technique",
    sousModules: [
      { code: "appel-offres", nom: "Appel d'offres" },
      { code: "gestion-projet", nom: "Gestion de projet" },
      { code: "demande-rh-projet", nom: "Demande de Ressource Humaine" },
      { code: "demande-logistique", nom: "Demande de Ressources logistiques" },
      { code: "liste-articles", nom: "Liste des articles" },
    ],
  },
  {
    code: "achat",
    nom: "Service Achat",
    sousModules: [{ code: "acces", nom: "Service Achat" }],
  },
  {
    code: "logistique",
    nom: "Service Logistique",
    sousModules: [
      { code: "magasins", nom: "Magasins" },
      { code: "fiche-inventaire", nom: "Fiche Inventaire Article" },
      { code: "flux-sortie", nom: "Flux Sortie Stock" },
      { code: "flux-entree", nom: "Flux Entrée Stock" },
      { code: "inventaire-periodique", nom: "Inventaire Périodique" },
      { code: "seuil-alerte", nom: "Seuil d'Alerte / Réapprovisionnement" },
      { code: "suivi-vehicules-engins", nom: "Suivi Véhicules & Engins" },
      { code: "pieces-admin-vehicules", nom: "Pièces administratives véhicules" },
      { code: "suivi-conso-carburant", nom: "Suivi consommation carburant" },
      { code: "demande-transport", nom: "Demande de Transport" },
      { code: "inspection-vehicule", nom: "Inspection Entrée Véhicule" },
      { code: "inspection-engin", nom: "Inspection Entrée Engin" },
      { code: "bon-sortie", nom: "Bon de Sortie et Transfert" },
      { code: "tableaux-suivi", nom: "Tableaux de suivi" },
    ],
  },
  {
    code: "qhse",
    nom: "Service QHSE",
    sousModules: [
      { code: "accueil-securite", nom: "Accueil Sécurité" },
      { code: "ast", nom: "Analyse Sécuritaire des Tâches" },
      { code: "stock-epi", nom: "Gestion du stock des EPI" },
      { code: "inspection-hse", nom: "Inspection HSE" },
      { code: "rapport-hebdo", nom: "Rapport HSE Chantier Hebdomadaire" },
      { code: "programme-sensibilisation", nom: "Programme de Sensibilisation" },
      { code: "pv-sensibilisation", nom: "PV de Sensibilisation" },
      { code: "rapport-incident", nom: "Rapport Incident / Accident" },
      { code: "non-conformite", nom: "Non-Conformité" },
    ],
  },
  {
    code: "carburant",
    nom: "Gestion Carburant",
    sousModules: [
      { code: "depots", nom: "Lieux de stockage carburant" },
      { code: "demande-carburant", nom: "Demande de carburant" },
    ],
  },
  {
    code: "assistant-direction",
    nom: "Assistant de Direction",
    sousModules: [{ code: "archivage-documentaire", nom: "Archivage documentaire" }],
  },
];

async function seedReferentielModules() {
  for (const [ordreModule, moduleDef] of referentielModules.entries()) {
    const moduleCree = await prisma.module.upsert({
      where: { code: moduleDef.code },
      update: { nom: moduleDef.nom, visibleMenu: moduleDef.visibleMenu ?? true },
      create: {
        code: moduleDef.code,
        nom: moduleDef.nom,
        ordre: ordreModule,
        visibleMenu: moduleDef.visibleMenu ?? true,
      },
    });

    for (const [ordreSousModule, sousModuleDef] of moduleDef.sousModules.entries()) {
      await prisma.sousModule.upsert({
        where: { moduleId_code: { moduleId: moduleCree.id, code: sousModuleDef.code } },
        update: { nom: sousModuleDef.nom, actif: sousModuleDef.actif ?? true },
        create: {
          moduleId: moduleCree.id,
          code: sousModuleDef.code,
          nom: sousModuleDef.nom,
          ordre: ordreSousModule,
          actif: sousModuleDef.actif ?? true,
        },
      });
    }
  }
}

async function seedFonctions() {
  const tousLesSousModulesSauf = async (codesExclus: string[]) =>
    prisma.sousModule.findMany({
      where: { code: { notIn: codesExclus }, actif: true },
    });

  // Fonction RH : accès à tous les modules métier + au module transversal
  // "authentification-roles" (seule fonction à l'avoir par défaut).
  const rhFonction = await prisma.fonction.upsert({
    where: { nom: "Responsable RH" },
    update: {},
    create: { nom: "Responsable RH", description: "Gestion administrative du personnel" },
  });
  const sousModulesRh = await tousLesSousModulesSauf(["pointage"]);
  for (const sousModule of sousModulesRh) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: { fonctionId: rhFonction.id, sousModuleId: sousModule.id },
      },
      update: {},
      create: { fonctionId: rhFonction.id, sousModuleId: sousModule.id, activeParDefaut: true },
    });
  }

  // Fonction Chef de chantier : accès limité (Logistique, QHSE, RH côté
  // relevé d'activité/congés) — sert à démontrer une sidebar différente.
  const chefChantierFonction = await prisma.fonction.upsert({
    where: { nom: "Chef de chantier" },
    update: {},
    create: { nom: "Chef de chantier", description: "Encadrement de chantier" },
  });
  const codesChefChantier = [
    "conge-permission",
    "releve-activite",
    "mission",
    "magasins",
    "flux-sortie",
    "demande-transport",
    "accueil-securite",
    "ast",
    "rapport-hebdo",
  ];
  const sousModulesChefChantier = await prisma.sousModule.findMany({
    where: { code: { in: codesChefChantier } },
  });
  for (const sousModule of sousModulesChefChantier) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: {
          fonctionId: chefChantierFonction.id,
          sousModuleId: sousModule.id,
        },
      },
      update: {},
      create: {
        fonctionId: chefChantierFonction.id,
        sousModuleId: sousModule.id,
        activeParDefaut: true,
      },
    });
  }

  return { rhFonction, chefChantierFonction };
}

async function seedUtilisateursTest(fonctions: {
  rhFonction: { id: string };
  chefChantierFonction: { id: string };
}) {
  const admin = createAdminClient();

  const comptesTest = [
    {
      email: "rh.test@itamanager.cloud",
      nom: "Diop",
      prenom: "Fatou",
      niveauHierarchique: "CHEF_SERVICE" as const,
      fonctionId: fonctions.rhFonction.id,
    },
    {
      email: "chantier.test@itamanager.cloud",
      nom: "Ndiaye",
      prenom: "Moussa",
      niveauHierarchique: "AGENT" as const,
      fonctionId: fonctions.chefChantierFonction.id,
    },
  ];

  for (const compte of comptesTest) {
    const utilisateurExistant = await prisma.utilisateur.findUnique({
      where: { email: compte.email },
    });
    if (utilisateurExistant) continue;

    const { data, error } = await admin.auth.admin.createUser({
      email: compte.email,
      password: "ChangeMoi123!",
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Création du compte Auth ${compte.email} impossible : ${error?.message}`);
    }

    const utilisateur = await prisma.utilisateur.create({
      data: {
        authUserId: data.user.id,
        nom: compte.nom,
        prenom: compte.prenom,
        email: compte.email,
        niveauHierarchique: compte.niveauHierarchique,
        fonctionId: compte.fonctionId,
      },
    });

    const defauts = await prisma.fonctionModuleDefaut.findMany({
      where: { fonctionId: compte.fonctionId },
    });
    if (defauts.length > 0) {
      await prisma.accesUtilisateur.createMany({
        data: defauts.map((defaut) => ({
          utilisateurId: utilisateur.id,
          sousModuleId: defaut.sousModuleId,
          actif: defaut.activeParDefaut,
          estException: false,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`Utilisateur test créé : ${compte.email} (mot de passe temporaire : ChangeMoi123!)`);
  }
}

async function main() {
  await seedReferentielModules();
  const fonctions = await seedFonctions();
  await seedUtilisateursTest(fonctions);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
