"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import { creerOuReutiliserNonConformite } from "@/lib/server-actions/qhse-non-conformite";
import {
  creerRapportIncidentSchema,
  type CreerRapportIncidentInput,
} from "@/types/validations/qhse-incident";

async function requireAccesRapportIncident() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "rapport-incident");
  return utilisateur;
}

/**
 * Flux 6 — enregistrement direct, "sous 24h" est une attente de délai, pas
 * une porte d'approbation. nonConformiteIdentifiee est un champ NOUVEAU,
 * purement applicatif (cf. CLAUDE.md) : déclenche
 * creerOuReutiliserNonConformite() quand coché.
 */
export async function creerRapportIncident(
  input: CreerRapportIncidentInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesRapportIncident();

  const analyse = creerRapportIncidentSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const rapport = await prisma.rapportIncident.create({
    data: {
      dateEvenement: new Date(donnees.dateEvenement),
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      lieu: donnees.lieu || null,
      directionServiceLibre: donnees.directionServiceLibre || null,
      reporteParId: utilisateur.id,
      typeNotification: donnees.typeNotification,
      activite: donnees.activite,
      activiteAutrePrecision: donnees.activiteAutrePrecision || null,
      descriptionDommages: donnees.descriptionDommages,
      descriptionDommagesAutrePrecision: donnees.descriptionDommagesAutrePrecision || null,
      resumeEvenement: donnees.resumeEvenement,
      schemaCorporelPartiesAtteintes: donnees.schemaCorporelPartiesAtteintes,
      typeBlessure: donnees.typeBlessure,
      descriptionBlessure: donnees.descriptionBlessure || null,
      dommagesEnvironnementaux: donnees.dommagesEnvironnementaux,
      dommagesEnvironnementauxAutrePrecision: donnees.dommagesEnvironnementauxAutrePrecision || null,
      descriptionDommagesEnvironnementaux: donnees.descriptionDommagesEnvironnementaux || null,
      rapportPolice: donnees.rapportPolice,
      datePolice: donnees.datePolice ? new Date(donnees.datePolice) : null,
      postePolice: donnees.postePolice || null,
      rapportAssurance: donnees.rapportAssurance,
      dateAssurance: donnees.dateAssurance ? new Date(donnees.dateAssurance) : null,
      referenceAssurance: donnees.referenceAssurance || null,
      rapportExpertise: donnees.rapportExpertise,
      dateExpertise: donnees.dateExpertise ? new Date(donnees.dateExpertise) : null,
      referenceExpertise: donnees.referenceExpertise || null,
      dommagesBiensEquipementsDetails: donnees.dommagesBiensEquipementsDetails || null,
      fraisMedicauxCoutDommages: donnees.fraisMedicauxCoutDommages ?? null,
      equipeInvestigation: donnees.equipeInvestigation,
      causesMatiere: donnees.causesMatiere,
      causesMethode: donnees.causesMethode,
      causesMainOeuvre: donnees.causesMainOeuvre,
      causesMachine: donnees.causesMachine,
      causesMilieu: donnees.causesMilieu,
      causesDivers: donnees.causesDivers,
      analyseCausesMatiere: donnees.analyseCausesMatiere || null,
      analyseCausesMethode: donnees.analyseCausesMethode || null,
      analyseCausesMainOeuvre: donnees.analyseCausesMainOeuvre || null,
      analyseCausesMachine: donnees.analyseCausesMachine || null,
      analyseCausesMilieu: donnees.analyseCausesMilieu || null,
      nonConformiteIdentifiee: donnees.nonConformiteIdentifiee,
      nonConformiteDescription: donnees.nonConformiteDescription || null,
      creeParId: utilisateur.id,
      personnesImpliquees: {
        create: donnees.personnesImpliquees.map((p) => ({
          role: p.role,
          nom: p.nom,
          fonction: p.fonction || null,
          typePersonne: p.typePersonne,
        })),
      },
      actionsImmediates: {
        create: donnees.actionsImmediates.map((a) => ({
          action: a.action,
          responsable: a.responsable,
          clotureLe: a.clotureLe ? new Date(a.clotureLe) : null,
        })),
      },
      corrections: {
        create: donnees.corrections.map((c) => ({
          correction: c.correction,
          responsable: c.responsable,
          echeance: c.echeance ? new Date(c.echeance) : null,
          ressourcesNecessaires: c.ressourcesNecessaires || null,
          clotureLe: c.clotureLe ? new Date(c.clotureLe) : null,
        })),
      },
    },
  });

  if (donnees.nonConformiteIdentifiee) {
    await creerOuReutiliserNonConformite(
      {
        type: "RAPPORT_INCIDENT",
        rapportIncidentId: rapport.id,
        description:
          donnees.nonConformiteDescription?.trim() ||
          `Non-conformité identifiée — Rapport Incident RI-${String(rapport.numero).padStart(5, "0")}`,
      },
      utilisateur.id,
    );
  }

  return { succes: true };
}

export async function ajouterPhotoRapportIncident(
  rapportIncidentId: string,
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesRapportIncident();

  const fichiers = formData.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return { erreur: "Aucun fichier fourni." };

  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX_OCTETS) return { erreur: "Une photo dépasse la taille maximale (20 Mo)." };
    if (!MIME_TYPES_AUTORISES.includes(fichier.type)) {
      return { erreur: `Type de fichier non autorisé : ${fichier.name}.` };
    }
  }

  const supabaseAdmin = createAdminClient();
  for (const fichier of fichiers) {
    const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
    const cheminFichier = `qhse/rapport-incident/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(cheminFichier, fichier, { contentType: fichier.type });
    if (uploadError) continue;

    await prisma.photoRapportIncident.create({
      data: {
        rapportIncidentId,
        cheminFichier,
        nomFichierOriginal: fichier.name,
        ajouteParId: utilisateur.id,
      },
    });
  }

  return { succes: true };
}

export async function listerRapportsIncident() {
  await requireAccesRapportIncident();

  return prisma.rapportIncident.findMany({
    include: {
      reportePar: { select: { nom: true, prenom: true } },
      nonConformite: true,
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirRapportIncident(id: string) {
  await requireAccesRapportIncident();

  const supabaseAdmin = createAdminClient();
  const rapport = await prisma.rapportIncident.findUnique({
    where: { id },
    include: {
      reportePar: { select: { nom: true, prenom: true } },
      personnesImpliquees: true,
      actionsImmediates: true,
      corrections: true,
      photos: true,
      nonConformite: true,
    },
  });
  if (!rapport) return null;

  const photosAvecUrl = await Promise.all(
    rapport.photos.map(async (photo) => {
      const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(photo.cheminFichier, 300);
      return { ...photo, urlTelechargement: data?.signedUrl ?? null };
    }),
  );

  return { ...rapport, photos: photosAvecUrl };
}
