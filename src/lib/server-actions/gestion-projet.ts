"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerProjetSchema,
  ajouterPointValidationSchema,
  type CreerProjetInput,
  type AjouterPointValidationInput,
} from "@/types/validations/direction-technique";

const SOUS_MODULE_LIEN = "/dashboard/direction-technique/gestion-projet";

async function requireAccesGestionProjet() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "direction-technique", "gestion-projet");
  return utilisateur;
}

export async function creerProjet(
  input: CreerProjetInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesGestionProjet();

  const analyse = creerProjetSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.projet.create({
    data: {
      nom: donnees.nom,
      dateDebut: new Date(donnees.dateDebut),
      dateFin: donnees.dateFin ? new Date(donnees.dateFin) : null,
      description: donnees.description,
      chefProjetId: donnees.chefProjetId,
    },
  });

  return { succes: true };
}

export async function listerProjets() {
  await requireAccesGestionProjet();

  return prisma.projet.findMany({
    include: {
      chefProjet: { select: { nom: true, prenom: true } },
      pointsValidation: { orderBy: { echeance: "asc" } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirProjet(projetId: string) {
  await requireAccesGestionProjet();

  return prisma.projet.findUnique({
    where: { id: projetId },
    include: {
      chefProjet: { select: { nom: true, prenom: true } },
      pointsValidation: {
        include: { cocheur: { select: { nom: true, prenom: true } } },
        orderBy: { echeance: "asc" },
      },
    },
  });
}

export async function ajouterPointValidation(
  input: AjouterPointValidationInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesGestionProjet();

  const analyse = ajouterPointValidationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.pointValidation.create({
    data: {
      projetId: donnees.projetId,
      libelle: donnees.libelle,
      echeance: new Date(donnees.echeance),
    },
  });

  return { succes: true };
}

export async function cocherPointValidation(
  pointId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesGestionProjet();

  const point = await prisma.pointValidation.findUnique({ where: { id: pointId } });
  if (!point) return { erreur: "Point de validation introuvable." };
  if (point.statut === "FAIT") return { erreur: "Ce point est déjà marqué comme fait." };

  await prisma.pointValidation.update({
    where: { id: pointId },
    data: { statut: "FAIT", cochePar: utilisateur.id, dateValidation: new Date() },
  });

  return { succes: true };
}

/**
 * Vérification "pull" à la navigation, pas une tâche planifiée — aucune
 * infrastructure cron n'existe dans ce projet (cf. CLAUDE.md). Appelée
 * depuis dashboard/layout.tsx, scoping à l'utilisateur courant (requête
 * indexée, même coût que les vérifications déjà présentes à cet endroit).
 * Notifie le chef de projet ET son superieurId (le document de cadrage
 * demande explicitement les deux). Idempotent via @@unique — ne repasse
 * jamais un `lu: true` à false.
 */
export async function verifierEtCreerAlertesEcheance(utilisateurId: string): Promise<void> {
  const dansSeptJours = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const points = await prisma.pointValidation.findMany({
    where: {
      statut: "A_FAIRE",
      echeance: { lte: dansSeptJours },
      projet: {
        OR: [{ chefProjetId: utilisateurId }, { chefProjet: { superieurId: utilisateurId } }],
      },
    },
    include: { projet: { select: { nom: true } } },
  });

  if (points.length === 0) return;

  await prisma.notification.createMany({
    data: points.map((point) => ({
      destinataireId: utilisateurId,
      titre: `Échéance ${point.echeance < new Date() ? "dépassée" : "à venir"} — ${point.projet.nom}`,
      description: point.libelle,
      entiteType: "PointValidation",
      entiteId: point.id,
      lienDetail: `${SOUS_MODULE_LIEN}/${point.projetId}`,
    })),
    skipDuplicates: true,
  });
}

export async function listerNotifications() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  return prisma.notification.findMany({
    where: { destinataireId: utilisateur.id },
    orderBy: { dateCreation: "desc" },
    take: 30,
  });
}

export async function marquerNotificationLue(notificationId: string): Promise<void> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await prisma.notification.updateMany({
    where: { id: notificationId, destinataireId: utilisateur.id },
    data: { lu: true },
  });
}
