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
  icone: string; // nom d'export lucide-react, résolu par resoudreIcone() côté sidebar
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
    icone: "ShieldCheck",
    visibleMenu: false,
    sousModules: [{ code: "gestion-comptes-acces", nom: "Gestion des comptes et accès" }],
  },
  {
    code: "direction-generale",
    nom: "Direction Générale",
    icone: "Building2",
    sousModules: [
      { code: "validations-centralisees", nom: "Validations centralisées" },
      { code: "suivi", nom: "Suivi" },
      { code: "kpi", nom: "KPI" },
    ],
  },
  {
    code: "rh",
    nom: "Ressources Humaines",
    icone: "Users",
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
    icone: "Wallet",
    sousModules: [
      { code: "paiement-standard", nom: "Paiement standard" },
      { code: "paiement-urgent-wave", nom: "Paiement urgent quotidien (Wave)" },
    ],
  },
  {
    code: "direction-technique",
    nom: "Direction Technique",
    icone: "HardHat",
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
    icone: "ShoppingCart",
    sousModules: [{ code: "acces", nom: "Service Achat" }],
  },
  {
    code: "logistique",
    nom: "Service Logistique",
    icone: "Truck",
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
    icone: "ShieldAlert",
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
    icone: "Fuel",
    sousModules: [
      { code: "depots", nom: "Lieux de stockage carburant" },
      { code: "demande-carburant", nom: "Demande de carburant" },
    ],
  },
  {
    code: "assistant-direction",
    nom: "Assistant de Direction",
    icone: "Archive",
    sousModules: [{ code: "archivage-documentaire", nom: "Archivage documentaire" }],
  },
];

async function seedReferentielModules() {
  for (const [ordreModule, moduleDef] of referentielModules.entries()) {
    const moduleCree = await prisma.module.upsert({
      where: { code: moduleDef.code },
      update: { nom: moduleDef.nom, icone: moduleDef.icone, visibleMenu: moduleDef.visibleMenu ?? true },
      create: {
        code: moduleDef.code,
        nom: moduleDef.nom,
        icone: moduleDef.icone,
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

/// Référentiels Service Logistique (Lot 6, Livraison A) — contenu réel tiré
/// du document officiel "Workflow_Gestion_Inventaires_ITA" (4 magasins, 6
/// catégories, 6 unités de mesure), pas inventé. Tables plutôt qu'enums :
/// éditables sans migration si une catégorie/unité doit être corrigée. Cf.
/// CLAUDE.md.
async function seedMagasins() {
  const magasins = [
    { code: "MAG-01", nom: "Central (Abidjan)" },
    { code: "MAG-02", nom: "Bouaké" },
    { code: "MAG-03", nom: "Botro" },
    { code: "MAG-04", nom: "Base vie" },
  ];
  for (const magasin of magasins) {
    await prisma.magasin.upsert({
      where: { code: magasin.code },
      update: { nom: magasin.nom },
      create: magasin,
    });
  }
}

async function seedCategoriesMateriel() {
  const categories = [
    { code: "PETIT_MATERIEL", nom: "Petit matériel" },
    { code: "MOBILIER", nom: "Mobilier" },
    { code: "EPI", nom: "EPI" },
    { code: "FOURNITURE", nom: "Fourniture" },
    { code: "ENTRETIEN", nom: "Entretien" },
    { code: "CONSOMMABLE", nom: "Consommable" },
  ];
  for (const [ordre, categorie] of categories.entries()) {
    await prisma.categorieMateriel.upsert({
      where: { code: categorie.code },
      update: { nom: categorie.nom },
      create: { ...categorie, ordre },
    });
  }
}

async function seedUnitesMesure() {
  const unites = [
    { code: "PIECE", nom: "Pièce" },
    { code: "KG", nom: "Kg" },
    { code: "LITRE", nom: "Litre" },
    { code: "METRE", nom: "Mètre" },
    { code: "BOITE", nom: "Boîte" },
    { code: "AUTRE", nom: "Autre" },
  ];
  for (const [ordre, unite] of unites.entries()) {
    await prisma.uniteMesure.upsert({
      where: { code: unite.code },
      update: { nom: unite.nom },
      create: { ...unite, ordre },
    });
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
    // Lot 3 — ajout délibéré : persona demandeur carburant réaliste et
    // propre (distinct de l'accès déjà large et non-corrigé de RH).
    "demande-carburant",
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

  // Fonction Direction Générale : accès aux 3 sous-modules du module DG +
  // gestion-comptes-acces (administration des comptes) — indépendamment de
  // l'accès déjà large (connu, non corrigé) de "Responsable RH".
  const dgFonction = await prisma.fonction.upsert({
    where: { nom: "Direction Générale" },
    update: {},
    create: { nom: "Direction Générale", description: "Pilotage et validations transverses" },
  });
  const sousModulesDg = await prisma.sousModule.findMany({
    where: { code: { in: ["validations-centralisees", "suivi", "kpi", "gestion-comptes-acces"] } },
  });
  for (const sousModule of sousModulesDg) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: { fonctionId: dgFonction.id, sousModuleId: sousModule.id },
      },
      update: {},
      create: { fonctionId: dgFonction.id, sousModuleId: sousModule.id, activeParDefaut: true },
    });
  }

  // Fonction Responsable Logistique/Carburant (Lot 3) : accès UNIQUEMENT à
  // "depots" (pas "demande-carburant") — un même responsable ne doit pas
  // pouvoir soumettre puis auto-valider sa propre demande. Scoping au
  // module "carburant" ; sans rapport avec le module "logistique" (Service
  // Logistique) déjà seedé séparément.
  const logistiqueFonction = await prisma.fonction.upsert({
    where: { nom: "Responsable Logistique/Carburant" },
    update: {},
    create: {
      nom: "Responsable Logistique/Carburant",
      description:
        "Gestion des dépôts et validation des demandes du module Carburant (distinct du module Service Logistique)",
    },
  });
  const sousModulesLogistique = await prisma.sousModule.findMany({
    where: { code: "depots" },
  });
  for (const sousModule of sousModulesLogistique) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: {
          fonctionId: logistiqueFonction.id,
          sousModuleId: sousModule.id,
        },
      },
      update: {},
      create: {
        fonctionId: logistiqueFonction.id,
        sousModuleId: sousModule.id,
        activeParDefaut: true,
      },
    });
  }

  // Fonction Directeur Technique (Lot 5) : accès aux 5 sous-modules du
  // module direction-technique — persona dédiée plutôt que de s'appuyer
  // sur l'accès déjà large et non-corrigé de "Responsable RH", même
  // précédent que "Responsable Logistique/Carburant" (Lot 3).
  const directionTechniqueFonction = await prisma.fonction.upsert({
    where: { nom: "Directeur Technique" },
    update: {},
    create: {
      nom: "Directeur Technique",
      description: "Pilotage des appels d'offres, projets et ressources techniques",
    },
  });
  const sousModulesDirectionTechnique = await prisma.sousModule.findMany({
    where: {
      code: {
        in: [
          "appel-offres",
          "gestion-projet",
          "demande-rh-projet",
          "demande-logistique",
          "liste-articles",
        ],
      },
    },
  });
  for (const sousModule of sousModulesDirectionTechnique) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: {
          fonctionId: directionTechniqueFonction.id,
          sousModuleId: sousModule.id,
        },
      },
      update: {},
      create: {
        fonctionId: directionTechniqueFonction.id,
        sousModuleId: sousModule.id,
        activeParDefaut: true,
      },
    });
  }

  // Fonction Responsable Service Logistique (Lot 6, "Logisticien") : accès
  // aux 6 sous-modules de la Livraison A. Débloque au passage
  // resoudreResponsableLogistiqueMateriel() (Lot 5, ciblait déjà
  // logistique/magasins) — zéro changement de code, uniquement ce seed.
  // Distincte de "Responsable Logistique/Carburant" (Lot 3, scopée à
  // carburant/depots) et de "Chef de Magasin" (rôle opérationnel local,
  // ci-dessous).
  const responsableServiceLogistiqueFonction = await prisma.fonction.upsert({
    where: { nom: "Responsable Service Logistique" },
    update: {},
    create: {
      nom: "Responsable Service Logistique",
      description:
        "Pilotage global du stock : magasins, fiche inventaire, décisions DMS/BEM, seuils d'alerte (distinct de Responsable Logistique/Carburant)",
    },
  });
  const codesResponsableServiceLogistique = [
    "magasins",
    "fiche-inventaire",
    "flux-sortie",
    "flux-entree",
    "inventaire-periodique",
    "seuil-alerte",
  ];
  const sousModulesResponsableServiceLogistique = await prisma.sousModule.findMany({
    where: { code: { in: codesResponsableServiceLogistique } },
  });
  for (const sousModule of sousModulesResponsableServiceLogistique) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: {
          fonctionId: responsableServiceLogistiqueFonction.id,
          sousModuleId: sousModule.id,
        },
      },
      update: {},
      create: {
        fonctionId: responsableServiceLogistiqueFonction.id,
        sousModuleId: sousModule.id,
        activeParDefaut: true,
      },
    });
  }

  // Fonction Chef de Magasin (Lot 6) : accès opérationnel local
  // (flux-sortie/flux-entree/inventaire-periodique) — pas magasins/
  // fiche-inventaire/seuil-alerte, réservés au rôle stratégique. L'autorité
  // réelle sur "vérifier une DMS" vient de Magasin.responsableId (routage
  // nommé), cette Fonction ne fait qu'ouvrir l'accès aux pages.
  const chefMagasinFonction = await prisma.fonction.upsert({
    where: { nom: "Chef de Magasin" },
    update: {},
    create: {
      nom: "Chef de Magasin",
      description: "Vérification des DMS, réception BEM et comptages d'inventaire pour son magasin",
    },
  });
  const codesChefMagasin = ["flux-sortie", "flux-entree", "inventaire-periodique"];
  const sousModulesChefMagasin = await prisma.sousModule.findMany({
    where: { code: { in: codesChefMagasin } },
  });
  for (const sousModule of sousModulesChefMagasin) {
    await prisma.fonctionModuleDefaut.upsert({
      where: {
        fonctionId_sousModuleId: { fonctionId: chefMagasinFonction.id, sousModuleId: sousModule.id },
      },
      update: {},
      create: { fonctionId: chefMagasinFonction.id, sousModuleId: sousModule.id, activeParDefaut: true },
    });
  }

  return {
    rhFonction,
    chefChantierFonction,
    dgFonction,
    logistiqueFonction,
    directionTechniqueFonction,
    responsableServiceLogistiqueFonction,
    chefMagasinFonction,
  };
}

async function seedUtilisateursTest(fonctions: {
  rhFonction: { id: string };
  chefChantierFonction: { id: string };
  dgFonction: { id: string };
  logistiqueFonction: { id: string };
  directionTechniqueFonction: { id: string };
  responsableServiceLogistiqueFonction: { id: string };
  chefMagasinFonction: { id: string };
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
    {
      email: "dg.test@itamanager.cloud",
      nom: "Sarr",
      prenom: "Aminata",
      // Volontairement DIRECTEUR : permet de tester le filtre
      // enAttenteValidationDe côté Validations centralisées.
      niveauHierarchique: "DIRECTEUR" as const,
      fonctionId: fonctions.dgFonction.id,
    },
    {
      email: "logistique.test@itamanager.cloud",
      nom: "Ba",
      prenom: "Cheikh",
      niveauHierarchique: "CHEF_SERVICE" as const,
      fonctionId: fonctions.logistiqueFonction.id,
    },
    {
      email: "direction-technique.test@itamanager.cloud",
      nom: "Fall",
      prenom: "Ibrahima",
      niveauHierarchique: "CHEF_SERVICE" as const,
      fonctionId: fonctions.directionTechniqueFonction.id,
    },
    {
      email: "responsable-logistique.test@itamanager.cloud",
      nom: "Sow",
      prenom: "Ousmane",
      niveauHierarchique: "CHEF_SERVICE" as const,
      fonctionId: fonctions.responsableServiceLogistiqueFonction.id,
    },
    {
      email: "chef-magasin.test@itamanager.cloud",
      nom: "Traoré",
      prenom: "Aïssata",
      niveauHierarchique: "AGENT" as const,
      fonctionId: fonctions.chefMagasinFonction.id,
      // Assigné responsable de MAG-01 après création (cf. boucle ci-dessous)
      // — rend le circuit DMS→BSM testable de bout en bout.
      magasinResponsableCode: "MAG-01",
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

    if ("magasinResponsableCode" in compte && compte.magasinResponsableCode) {
      await prisma.magasin.update({
        where: { code: compte.magasinResponsableCode },
        data: { responsableId: utilisateur.id },
      });
    }

    console.log(`Utilisateur test créé : ${compte.email} (mot de passe temporaire : ChangeMoi123!)`);
  }
}

/// Référentiel de test Lot 3 — dépôt et véhicules durables, pas des
/// artefacts jetables de vérification (comme le sont les demandes/
/// réapprovisionnements créés pendant les tests manuels).
async function seedCarburantTest() {
  const depotExistant = await prisma.depot.findFirst({
    where: { nom: "Dépôt Principal Dakar" },
  });
  if (!depotExistant) {
    await prisma.depot.create({
      data: {
        nom: "Dépôt Principal Dakar",
        localisation: "Zone industrielle, Dakar",
        chantiersRattaches: ["Chantier A", "Chantier B"],
        quantiteStockLitres: 5000,
      },
    });
  }

  await prisma.vehicule.upsert({
    where: { immatriculation: "DK-1234-AA" },
    update: {},
    create: { immatriculation: "DK-1234-AA", type: "LEGER", quotaMensuelLitres: 300 },
  });
  await prisma.vehicule.upsert({
    where: { immatriculation: "DK-5678-BB" },
    update: {},
    create: { immatriculation: "DK-5678-BB", type: "LOURD", quotaMensuelLitres: 800 },
  });
}

/// Référentiel de test Lot 5 — Materiel (Logistique, Lot 6) et Article
/// (Achat, Lot 7) durables, pas des artefacts jetables.
async function seedDirectionTechniqueTest() {
  const materielExistant = await prisma.materiel.findFirst({
    where: { designation: "Bétonnière 350L" },
  });
  if (!materielExistant) {
    await prisma.materiel.create({ data: { designation: "Bétonnière 350L", disponible: true } });
  }

  const articleExistant = await prisma.article.findFirst({
    where: { designation: "Ciment CEM II 42.5 (sac 50kg)" },
  });
  if (!articleExistant) {
    await prisma.article.create({ data: { designation: "Ciment CEM II 42.5 (sac 50kg)" } });
  }
}

/// Fiches article réelles (Lot 6, Livraison A) — rattachées à MAG-01,
/// durables. "Gants de manutention" volontairement sous son seuil pour que
/// seuil-alerte ait quelque chose à détecter sans manipulation préalable.
async function seedLogistiqueTest() {
  const mag01 = await prisma.magasin.findUniqueOrThrow({ where: { code: "MAG-01" } });
  const categorieEpi = await prisma.categorieMateriel.findUniqueOrThrow({ where: { code: "EPI" } });
  const categorieConsommable = await prisma.categorieMateriel.findUniqueOrThrow({
    where: { code: "CONSOMMABLE" },
  });
  const unitePiece = await prisma.uniteMesure.findUniqueOrThrow({ where: { code: "PIECE" } });
  const uniteBoite = await prisma.uniteMesure.findUniqueOrThrow({ where: { code: "BOITE" } });

  const materiels = [
    {
      reference: "ART-00001",
      designation: "Casque de chantier",
      categorieId: categorieEpi.id,
      uniteMesureId: unitePiece.id,
      quantiteStock: 42,
      seuilAlerte: 15,
      stockSecurite: 8,
    },
    {
      reference: "ART-00002",
      designation: "Gants de manutention (paire)",
      categorieId: categorieEpi.id,
      uniteMesureId: uniteBoite.id,
      quantiteStock: 8,
      seuilAlerte: 20,
      stockSecurite: 10,
    },
    {
      reference: "ART-00003",
      designation: "Disque à tronçonner Ø230mm",
      categorieId: categorieConsommable.id,
      uniteMesureId: unitePiece.id,
      quantiteStock: 30,
      seuilAlerte: 10,
      stockSecurite: 5,
    },
  ];

  for (const materiel of materiels) {
    const existant = await prisma.materiel.findFirst({ where: { designation: materiel.designation } });
    if (existant) continue;
    await prisma.materiel.create({
      data: {
        ...materiel,
        magasinId: mag01.id,
        disponible: true,
        dateCreationStock: new Date(),
      },
    });
  }
}

async function main() {
  await seedReferentielModules();
  await seedMagasins();
  await seedCategoriesMateriel();
  await seedUnitesMesure();
  const fonctions = await seedFonctions();
  await seedUtilisateursTest(fonctions);
  await seedCarburantTest();
  await seedDirectionTechniqueTest();
  await seedLogistiqueTest();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
