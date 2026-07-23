"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  creerDemandeTransportSchema,
  viserLogistiqueEtAffecterSchema,
  enregistrerDepartSchema,
  enregistrerRetourSchema,
  refuserDemandeTransportSchema,
  type CreerDemandeTransportInput,
  type ViserLogistiqueEtAffecterInput,
  type EnregistrerDepartInput,
  type EnregistrerRetourInput,
} from "@/types/validations/vehicules";

const TYPE_MODULE = "logistique";
const SOUS_MODULE = "demande-transport";
const LIEN_DETAIL = "/dashboard/logistique/demande-transport";

async function requireAccesDemandeTransport() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "demande-transport");
  return utilisateur;
}

async function peutViserLogistique(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

/**
 * Un véhicule n'appartient à aucun magasin (concept distinct) — le rôle
 * "Section Transport/Garage" (6.10) est donc réutilisé au sens identité
 * (est responsable d'AU MOINS un magasin), pas au sens instance nommée
 * comme pour une DMS. Évite aussi qu'un Chef de chantier (demandeur, a
 * accès flux-sortie) puisse viser son propre départ/retour.
 */
async function estResponsableDeMagasin(utilisateurId: string): Promise<boolean> {
  const magasin = await prisma.magasin.findFirst({ where: { responsableId: utilisateurId } });
  return magasin !== null;
}

async function resoudreLogisticien() {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      actif: true,
      utilisateur: { statut: "ACTIF" },
      sousModule: { code: "magasins", actif: true, module: { code: "logistique" } },
    },
    include: { utilisateur: true },
    orderBy: { utilisateur: { dateCreation: "asc" } },
  });
  return acces?.utilisateur ?? null;
}

async function resoudreResponsableGarage() {
  const magasin = await prisma.magasin.findFirst({
    where: { responsableId: { not: null }, responsable: { statut: "ACTIF" } },
    include: { responsable: true },
    orderBy: { responsable: { dateCreation: "asc" } },
  });
  return magasin?.responsable ?? null;
}

export async function creerDemandeTransport(
  input: CreerDemandeTransportInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesDemandeTransport();

  const analyse = creerDemandeTransportSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const logisticien = await resoudreLogisticien();
  if (!logisticien) {
    return {
      erreur: "Aucun Responsable Service Logistique actif n'est configuré — impossible de créer la demande.",
    };
  }

  const demande = await prisma.demandeTransport.create({
    data: {
      serviceChantier: donnees.serviceChantier,
      cia: donnees.cia,
      nature: donnees.nature,
      description: donnees.description,
      dateDebut: new Date(donnees.dateDebut),
      dateFin: new Date(donnees.dateFin),
      demandeurId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    statutNouveau: "SOUMIS",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DT-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de visa Logistique",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: logisticien.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function viserLogistiqueEtAffecter(
  input: ViserLogistiqueEtAffecterInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutViserLogistique(utilisateur.id))) redirect("/dashboard");

  const analyse = viserLogistiqueEtAffecterSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeTransport.findUnique({ where: { id: donnees.demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "SOUMIS") return { erreur: "Cette demande n'est plus en attente de visa." };

  const vehicule = await prisma.vehicule.findUnique({ where: { id: donnees.vehiculeId } });
  if (!vehicule) return { erreur: "Véhicule introuvable." };

  const responsableGarage = await resoudreResponsableGarage();
  if (!responsableGarage) {
    return { erreur: "Aucun Chef de Magasin actif n'est configuré — impossible de continuer." };
  }

  await prisma.$transaction([
    prisma.demandeTransport.update({
      where: { id: donnees.demandeId },
      data: {
        statut: "VISA_LOGISTIQUE",
        vehiculeId: donnees.vehiculeId,
        visaLogistiqueParId: utilisateur.id,
        dateVisaLogistique: new Date(),
      },
    }),
    prisma.historiqueMouvementVehicule.create({
      data: {
        vehiculeId: donnees.vehiculeId,
        type: "CHANGEMENT_AFFECTATION",
        chantierAvant: vehicule.chantierActuel,
        chantierApres: demande.serviceChantier,
        commentaire: `Affecté à la demande de transport DT-${String(demande.numero).padStart(5, "0")}`,
        effectueParId: utilisateur.id,
      },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    statutPrecedent: "SOUMIS",
    statutNouveau: "VISA_LOGISTIQUE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DT-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "En attente de vérification départ (Garage)",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsableGarage.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

/**
 * Clôt la partie "validation" du circuit — DemandeIndex passe à traité ici,
 * pas à la création. Le retour (enregistrerRetour) est un enregistrement
 * de clôture physique, pas une nouvelle approbation en attente —
 * simplification signalée, cf. CLAUDE.md.
 */
export async function enregistrerDepart(
  input: EnregistrerDepartInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await estResponsableDeMagasin(utilisateur.id))) redirect("/dashboard");

  const analyse = enregistrerDepartSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeTransport.findUnique({ where: { id: donnees.demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "VISA_LOGISTIQUE") {
    return { erreur: "Cette demande n'est plus en attente de vérification départ." };
  }
  if (!demande.vehiculeId) return { erreur: "Aucun véhicule affecté à cette demande." };

  await prisma.$transaction([
    prisma.demandeTransport.update({
      where: { id: donnees.demandeId },
      data: {
        statut: "EN_COURS",
        conducteurDepartNom: donnees.conducteurDepartNom,
        compteurDepart: donnees.compteurDepart,
        dateDepartReelle: new Date(),
        gestionnaireDepartId: utilisateur.id,
      },
    }),
    ...donnees.reponses.map((reponse) =>
      prisma.reponseChecklistTransport.upsert({
        where: { demandeId_itemId: { demandeId: donnees.demandeId, itemId: reponse.itemId } },
        update: { presentDepart: reponse.present },
        create: { demandeId: donnees.demandeId, itemId: reponse.itemId, presentDepart: reponse.present },
      }),
    ),
    prisma.vehicule.update({
      where: { id: demande.vehiculeId },
      data: { compteurActuel: donnees.compteurDepart, chantierActuel: demande.serviceChantier },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    statutPrecedent: "VISA_LOGISTIQUE",
    statutNouveau: "EN_COURS",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DT-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "En cours d'utilisation",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function enregistrerRetour(
  input: EnregistrerRetourInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await estResponsableDeMagasin(utilisateur.id))) redirect("/dashboard");

  const analyse = enregistrerRetourSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeTransport.findUnique({ where: { id: donnees.demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_COURS") {
    return { erreur: "Cette demande n'est plus en cours d'utilisation." };
  }
  if (!demande.vehiculeId) return { erreur: "Aucun véhicule affecté à cette demande." };

  await prisma.$transaction([
    prisma.demandeTransport.update({
      where: { id: donnees.demandeId },
      data: {
        statut: "ARCHIVE",
        conducteurRetourNom: donnees.conducteurRetourNom,
        compteurRetour: donnees.compteurRetour,
        dateRetourReelle: new Date(),
        gestionnaireRetourId: utilisateur.id,
        referenceEngin: donnees.referenceEngin || null,
      },
    }),
    ...donnees.reponses.map((reponse) =>
      prisma.reponseChecklistTransport.upsert({
        where: { demandeId_itemId: { demandeId: donnees.demandeId, itemId: reponse.itemId } },
        update: { presentRetour: reponse.present },
        create: { demandeId: donnees.demandeId, itemId: reponse.itemId, presentRetour: reponse.present },
      }),
    ),
    prisma.vehicule.update({
      where: { id: demande.vehiculeId },
      data: { compteurActuel: donnees.compteurRetour },
    }),
    prisma.historiqueMouvementVehicule.create({
      data: {
        vehiculeId: demande.vehiculeId,
        type: "CHANGEMENT_AFFECTATION",
        chantierAvant: demande.serviceChantier,
        chantierApres: null,
        commentaire: `Retour — demande de transport DT-${String(demande.numero).padStart(5, "0")}`,
        effectueParId: utilisateur.id,
      },
    }),
  ]);

  await enregistrerTransition({
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    statutPrecedent: "EN_COURS",
    statutNouveau: "ARCHIVE",
    acteurId: utilisateur.id,
  });

  return { succes: true };
}

export async function refuserDemandeTransport(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutViserLogistique(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserDemandeTransportSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeTransport.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "SOUMIS") return { erreur: "Cette demande n'est plus en attente de visa." };

  await prisma.demandeTransport.update({
    where: { id: demandeId },
    data: { statut: "REFUSE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    statutPrecedent: "SOUMIS",
    statutNouveau: "REFUSE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `DT-${String(demande.numero).padStart(5, "0")}`,
    entiteType: "DemandeTransport",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Refusée",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerDemandesTransport() {
  await requireAccesDemandeTransport();

  return prisma.demandeTransport.findMany({
    include: {
      demandeur: { select: { nom: true, prenom: true } },
      vehicule: true,
      reponsesChecklist: { include: { item: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAViserLogistique() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutViserLogistique(utilisateur.id))) return [];

  return prisma.demandeTransport.findMany({
    where: { statut: "SOUMIS" },
    include: { demandeur: { select: { nom: true, prenom: true } } },
    orderBy: { dateCreation: "asc" },
  });
}

export async function listerAGererGarage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await estResponsableDeMagasin(utilisateur.id))) return { aDepart: [], aRetour: [] };

  const [aDepart, aRetour] = await Promise.all([
    prisma.demandeTransport.findMany({
      where: { statut: "VISA_LOGISTIQUE" },
      include: { demandeur: { select: { nom: true, prenom: true } }, vehicule: true },
      orderBy: { dateVisaLogistique: "asc" },
    }),
    prisma.demandeTransport.findMany({
      where: { statut: "EN_COURS" },
      include: { demandeur: { select: { nom: true, prenom: true } }, vehicule: true },
      orderBy: { dateDepartReelle: "asc" },
    }),
  ]);

  return { aDepart, aRetour };
}

export async function listerVehiculesDisponibles() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.vehicule.findMany({
    where: { etat: "OK", dateSortieDefinitive: null },
    orderBy: { immatriculation: "asc" },
  });
}
