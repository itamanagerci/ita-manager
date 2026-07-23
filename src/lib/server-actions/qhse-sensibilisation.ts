"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerProgrammeSensibilisationSchema,
  ajouterSeanceSensibilisationSchema,
  creerPVSensibilisationSchema,
  type CreerProgrammeSensibilisationInput,
  type AjouterSeanceSensibilisationInput,
  type CreerPVSensibilisationInput,
} from "@/types/validations/qhse-incident";

async function requireAccesProgrammeSensibilisation() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "programme-sensibilisation");
  return utilisateur;
}

async function requireAccesPVSensibilisation() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "pv-sensibilisation");
  return utilisateur;
}

/** Flux 5A — conteneur période planifiant plusieurs séances. */
export async function creerProgrammeSensibilisation(
  input: CreerProgrammeSensibilisationInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesProgrammeSensibilisation();

  const analyse = creerProgrammeSensibilisationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.programmeSensibilisation.create({
    data: {
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      periodeDu: new Date(donnees.periodeDu),
      periodeAu: new Date(donnees.periodeAu),
      creeParId: utilisateur.id,
      seances: {
        create: donnees.seances.map((seance) => ({
          date: new Date(seance.date),
          theme: seance.theme,
          animateur: seance.animateur,
          commentaire: seance.commentaire || null,
        })),
      },
    },
  });

  return { succes: true };
}

export async function ajouterSeanceSensibilisation(
  programmeId: string,
  input: AjouterSeanceSensibilisationInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesProgrammeSensibilisation();

  const analyse = ajouterSeanceSensibilisationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.seanceSensibilisation.create({
    data: {
      programmeId,
      date: new Date(donnees.date),
      theme: donnees.theme,
      animateur: donnees.animateur,
      commentaire: donnees.commentaire || null,
    },
  });

  return { succes: true };
}

export async function listerProgrammesSensibilisation() {
  await requireAccesProgrammeSensibilisation();

  return prisma.programmeSensibilisation.findMany({
    include: { seances: { include: { pv: true }, orderBy: { date: "asc" } } },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirProgrammeSensibilisation(id: string) {
  await requireAccesProgrammeSensibilisation();

  return prisma.programmeSensibilisation.findUnique({
    where: { id },
    include: { seances: { include: { pv: true }, orderBy: { date: "asc" } } },
  });
}

export async function obtenirSeanceSensibilisation(seanceId: string) {
  await requireAccesPVSensibilisation();

  return prisma.seanceSensibilisation.findUnique({
    where: { id: seanceId },
    include: { pv: true, programme: true },
  });
}

/**
 * Flux 5B — référence EXACTEMENT une Séance (1:1, @@unique sur seanceId) —
 * erreur explicite plutôt qu'une violation de contrainte brute si la
 * séance a déjà son PV.
 */
export async function creerPVSensibilisation(
  seanceId: string,
  input: CreerPVSensibilisationInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPVSensibilisation();

  const analyse = creerPVSensibilisationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const seance = await prisma.seanceSensibilisation.findUnique({
    where: { id: seanceId },
    include: { pv: true },
  });
  if (!seance) return { erreur: "Séance introuvable." };
  if (seance.pv) return { erreur: "Cette séance a déjà un procès-verbal." };

  await prisma.pVSensibilisation.create({
    data: {
      seanceId,
      animateur: donnees.animateur,
      date: new Date(donnees.date),
      heure: donnees.heure || null,
      lieu: donnees.lieu || null,
      chantierType: donnees.chantierType,
      lieuAutrePrecision: donnees.lieuAutrePrecision || null,
      sujetsAbordes: donnees.sujetsAbordes,
      sujetsAbordesAutrePrecision: donnees.sujetsAbordesAutrePrecision || null,
      pointsSpecifiquesAbordes: donnees.pointsSpecifiquesAbordes || null,
      resumeSensibilisation: donnees.resumeSensibilisation || null,
      observation: donnees.observation || null,
      animateurVisaDate: new Date(),
      serviceQHSEVisaId: utilisateur.id,
      serviceQHSEVisaDate: new Date(),
      participants: {
        create: donnees.participants.map((p) => ({
          numero: p.numero,
          nom: p.nom,
          poste: p.poste || null,
          aSigne: p.aSigne,
        })),
      },
    },
  });

  return { succes: true };
}

export async function listerPVSensibilisation() {
  await requireAccesPVSensibilisation();

  return prisma.pVSensibilisation.findMany({
    include: { seance: { include: { programme: true } }, participants: true },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirPVSensibilisation(id: string) {
  await requireAccesPVSensibilisation();

  return prisma.pVSensibilisation.findUnique({
    where: { id },
    include: {
      seance: { include: { programme: true } },
      participants: { orderBy: { numero: "asc" } },
      serviceQHSEVisa: { select: { nom: true, prenom: true } },
    },
  });
}
