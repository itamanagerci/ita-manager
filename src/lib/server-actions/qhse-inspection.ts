"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import { creerOuReutiliserNonConformite } from "@/lib/server-actions/qhse-non-conformite";
import { creerInspectionHSESchema, type CreerInspectionHSEInput } from "@/types/validations/qhse-incident";

async function requireAccesInspectionHSE() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "inspection-hse");
  return utilisateur;
}

export async function listerPointsInspectionHSE() {
  await requireAccesInspectionHSE();
  return prisma.pointInspection.findMany({
    where: { categorie: "HSE", actif: true },
    orderBy: { ordre: "asc" },
  });
}

/**
 * Flux 4A — enregistrement direct, aucun circuit de validation propre (même
 * précédent que InspectionVehicule/InspectionEngin, Lot 6). Un NON déclenche
 * creerOuReutiliserNonConformite() par point, idempotent.
 */
export async function creerInspectionHSE(
  input: CreerInspectionHSEInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesInspectionHSE();

  const analyse = creerInspectionHSESchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const inspection = await prisma.inspectionHSE.create({
    data: {
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      projetOuvrageLibre: donnees.projetOuvrageLibre || null,
      lieu: donnees.lieu || null,
      date: new Date(donnees.date),
      heure: donnees.heure || null,
      commentaires: donnees.commentaires || null,
      responsableInspectionId: utilisateur.id,
      dateSignatureResponsable: new Date(),
      relaisQHSEId: donnees.relaisQHSEId || null,
      chefChantierId: donnees.chefChantierId || null,
      reponsesPoints: {
        create: donnees.reponsesPoints.map((reponse) => ({
          pointId: reponse.pointId,
          reponse: reponse.reponse,
          observation: reponse.observation || null,
        })),
      },
    },
    include: { reponsesPoints: { include: { point: true } } },
  });

  for (const reponse of inspection.reponsesPoints) {
    if (reponse.reponse === "NON") {
      await creerOuReutiliserNonConformite(
        { type: "POINT_INSPECTION_HSE", reponsePointId: reponse.id, libellePoint: reponse.point.libelle },
        utilisateur.id,
      );
    }
  }

  return { succes: true };
}

export async function ajouterPhotoInspectionHSE(
  inspectionId: string,
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesInspectionHSE();

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
    const cheminFichier = `qhse/inspection-hse/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(cheminFichier, fichier, { contentType: fichier.type });
    if (uploadError) continue;

    await prisma.photoInspectionHSE.create({
      data: { inspectionId, cheminFichier, nomFichierOriginal: fichier.name, ajouteParId: utilisateur.id },
    });
  }

  return { succes: true };
}

export async function listerInspectionsHSE() {
  await requireAccesInspectionHSE();

  return prisma.inspectionHSE.findMany({
    include: {
      responsableInspection: { select: { nom: true, prenom: true } },
      reponsesPoints: { include: { point: true, nonConformite: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirInspectionHSE(id: string) {
  await requireAccesInspectionHSE();

  const supabaseAdmin = createAdminClient();
  const inspection = await prisma.inspectionHSE.findUnique({
    where: { id },
    include: {
      responsableInspection: { select: { nom: true, prenom: true } },
      relaisQHSE: { select: { nom: true, prenom: true } },
      chefChantier: { select: { nom: true, prenom: true } },
      reponsesPoints: { include: { point: true, nonConformite: true }, orderBy: { point: { ordre: "asc" } } },
      photos: true,
    },
  });
  if (!inspection) return null;

  const photosAvecUrl = await Promise.all(
    inspection.photos.map(async (photo) => {
      const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(photo.cheminFichier, 300);
      return { ...photo, urlTelechargement: data?.signedUrl ?? null };
    }),
  );

  return { ...inspection, photos: photosAvecUrl };
}
