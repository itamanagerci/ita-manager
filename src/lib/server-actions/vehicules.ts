"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerVehiculeSchema,
  enregistrerChangementEtatSchema,
  enregistrerChangementAffectationSchema,
  enregistrerVerificationInventaireSchema,
  enregistrerSortieDefinitiveSchema,
  type CreerVehiculeInput,
  type EnregistrerChangementEtatInput,
  type EnregistrerChangementAffectationInput,
  type EnregistrerVerificationInventaireInput,
  type EnregistrerSortieDefinitiveInput,
} from "@/types/validations/vehicules";

async function requireAccesSuiviVehicules() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "suivi-vehicules-engins");
  return utilisateur;
}

export async function creerVehicule(
  input: CreerVehiculeInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesSuiviVehicules();

  const analyse = creerVehiculeSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const existant = await prisma.vehicule.findUnique({ where: { immatriculation: donnees.immatriculation } });
  if (existant) return { erreur: "Cette immatriculation existe déjà." };

  await prisma.vehicule.create({
    data: {
      immatriculation: donnees.immatriculation,
      type: donnees.type,
      quotaMensuelLitres: donnees.quotaMensuelLitres,
      numeroInterne: donnees.numeroInterne || null,
      marque: donnees.marque || null,
      modele: donnees.modele || null,
      annee: donnees.annee ?? null,
      dateEntree: donnees.dateEntree ? new Date(donnees.dateEntree) : null,
      modeAcquisition: donnees.modeAcquisition || null,
    },
  });

  return { succes: true };
}

export async function listerVehiculesComplet() {
  await requireAccesSuiviVehicules();

  return prisma.vehicule.findMany({
    include: { chauffeurActuel: { select: { nom: true, prenom: true } } },
    orderBy: { immatriculation: "asc" },
  });
}

/// Écrit le nouvel état et une ligne HistoriqueMouvementVehicule dans le
/// même $transaction([...]) batché — changer un statut n'est pas une
/// opération concurrente à protéger (pas de garde conditionnelle).
export async function enregistrerChangementEtat(
  input: EnregistrerChangementEtatInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesSuiviVehicules();

  const analyse = enregistrerChangementEtatSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const vehicule = await prisma.vehicule.findUnique({ where: { id: donnees.vehiculeId } });
  if (!vehicule) return { erreur: "Véhicule introuvable." };

  await prisma.$transaction([
    prisma.vehicule.update({ where: { id: donnees.vehiculeId }, data: { etat: donnees.etat } }),
    prisma.historiqueMouvementVehicule.create({
      data: {
        vehiculeId: donnees.vehiculeId,
        type: "CHANGEMENT_ETAT",
        etatAvant: vehicule.etat,
        etatApres: donnees.etat,
        commentaire: donnees.commentaire || null,
        effectueParId: utilisateur.id,
      },
    }),
  ]);

  return { succes: true };
}

export async function enregistrerChangementAffectation(
  input: EnregistrerChangementAffectationInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesSuiviVehicules();

  const analyse = enregistrerChangementAffectationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const vehicule = await prisma.vehicule.findUnique({ where: { id: donnees.vehiculeId } });
  if (!vehicule) return { erreur: "Véhicule introuvable." };

  await prisma.$transaction([
    prisma.vehicule.update({
      where: { id: donnees.vehiculeId },
      data: {
        chauffeurActuelId: donnees.chauffeurActuelId || null,
        chantierActuel: donnees.chantierActuel || null,
        dateAffectation: new Date(),
      },
    }),
    prisma.historiqueMouvementVehicule.create({
      data: {
        vehiculeId: donnees.vehiculeId,
        type: "CHANGEMENT_AFFECTATION",
        chantierAvant: vehicule.chantierActuel,
        chantierApres: donnees.chantierActuel || null,
        commentaire: donnees.commentaire || null,
        effectueParId: utilisateur.id,
      },
    }),
  ]);

  return { succes: true };
}

export async function enregistrerVerificationInventaire(
  input: EnregistrerVerificationInventaireInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesSuiviVehicules();

  const analyse = enregistrerVerificationInventaireSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.vehicule.update({
    where: { id: donnees.vehiculeId },
    data: {
      dateDerniereVerificationInventaire: new Date(),
      verificateurDerniereVerificationId: utilisateur.id,
      etatConstateDerniereVerification: donnees.etatConstate,
    },
  });

  return { succes: true };
}

export async function enregistrerSortieDefinitive(
  input: EnregistrerSortieDefinitiveInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesSuiviVehicules();

  const analyse = enregistrerSortieDefinitiveSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.$transaction([
    prisma.vehicule.update({
      where: { id: donnees.vehiculeId },
      data: {
        dateSortieDefinitive: new Date(),
        motifSortieDefinitive: donnees.motifSortieDefinitive,
        valeurResiduelle: donnees.valeurResiduelle ?? null,
      },
    }),
    prisma.historiqueMouvementVehicule.create({
      data: {
        vehiculeId: donnees.vehiculeId,
        type: "SORTIE_DEFINITIVE",
        commentaire: donnees.motifSortieDefinitive,
      },
    }),
  ]);

  return { succes: true };
}

export async function listerHistoriqueMouvements(vehiculeId: string) {
  await requireAccesSuiviVehicules();

  return prisma.historiqueMouvementVehicule.findMany({
    where: { vehiculeId },
    include: { effectuePar: { select: { nom: true, prenom: true } } },
    orderBy: { date: "desc" },
  });
}
