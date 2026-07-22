"use server";

import { redirect } from "next/navigation";
import type { CategorieDocument } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUtilisateur, possedeAccesModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { BUCKET, TAILLE_MAX_OCTETS, MIME_TYPES_AUTORISES } from "@/lib/storage-constants";

const TOUTES_CATEGORIES: CategorieDocument[] = [
  "CONTRATS",
  "RH",
  "JURIDIQUE",
  "FACTURES",
  "QHSE",
  "ACHAT",
  "TECHNIQUE",
  "AUTRE",
];

async function requireAccesArchivage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "assistant-direction", "archivage-documentaire");
  return utilisateur;
}

/**
 * "RH" est visible uniquement si l'utilisateur a un accès réel (pas
 * seulement sa Fonction déclarative) au module rh OU direction-generale.
 */
async function peutVoirCategorieRH(utilisateurId: string): Promise<boolean> {
  return (
    (await possedeAccesModule(utilisateurId, "rh")) ||
    (await possedeAccesModule(utilisateurId, "direction-generale"))
  );
}

export async function categoriesAutoriseesPourUtilisateurCourant(): Promise<
  CategorieDocument[]
> {
  const utilisateur = await requireAccesArchivage();
  const peutVoirRH = await peutVoirCategorieRH(utilisateur.id);
  return peutVoirRH ? TOUTES_CATEGORIES : TOUTES_CATEGORIES.filter((c) => c !== "RH");
}

interface DocumentAvecUrl {
  id: string;
  titre: string;
  nomFichierOriginal: string;
  categorie: CategorieDocument;
  dateAjout: Date;
  ajoutePar: { nom: string; prenom: string } | null;
  urlTelechargement: string | null;
}

export async function listerDocuments(filtres: {
  categorie?: CategorieDocument;
  recherche?: string;
}): Promise<DocumentAvecUrl[]> {
  const utilisateur = await requireAccesArchivage();
  const peutVoirRH = await peutVoirCategorieRH(utilisateur.id);
  const categoriesVisibles = peutVoirRH
    ? TOUTES_CATEGORIES
    : TOUTES_CATEGORIES.filter((c) => c !== "RH");

  const categorieDemandee =
    filtres.categorie && categoriesVisibles.includes(filtres.categorie)
      ? filtres.categorie
      : undefined;

  const documents = await prisma.document.findMany({
    where: {
      categorie: categorieDemandee ? categorieDemandee : { in: categoriesVisibles },
      titre: filtres.recherche
        ? { contains: filtres.recherche, mode: "insensitive" }
        : undefined,
    },
    include: { ajoutePar: { select: { nom: true, prenom: true } } },
    orderBy: { dateAjout: "desc" },
  });

  const supabaseAdmin = createAdminClient();

  return Promise.all(
    documents.map(async (document) => {
      const { data } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(document.cheminFichier, 300);

      return {
        id: document.id,
        titre: document.titre,
        nomFichierOriginal: document.nomFichierOriginal,
        categorie: document.categorie,
        dateAjout: document.dateAjout,
        ajoutePar: document.ajoutePar,
        urlTelechargement: data?.signedUrl ?? null,
      };
    }),
  );
}

export async function ajouterDocument(
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesArchivage();

  const titre = formData.get("titre");
  const categorie = formData.get("categorie");
  const fichier = formData.get("fichier");

  if (typeof titre !== "string" || titre.trim().length === 0) {
    return { erreur: "Le titre est requis." };
  }
  if (typeof categorie !== "string" || !TOUTES_CATEGORIES.includes(categorie as CategorieDocument)) {
    return { erreur: "Catégorie invalide." };
  }
  if (categorie === "RH" && !(await peutVoirCategorieRH(utilisateur.id))) {
    return { erreur: "Vous n'êtes pas autorisé à archiver un document dans la catégorie RH." };
  }
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: "Un fichier est requis." };
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return { erreur: "Le fichier dépasse la taille maximale autorisée (20 Mo)." };
  }
  if (!MIME_TYPES_AUTORISES.includes(fichier.type)) {
    return { erreur: "Type de fichier non autorisé." };
  }

  const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
  const cheminFichier = `${categorie.toLowerCase()}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

  const supabaseAdmin = createAdminClient();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(cheminFichier, fichier, { contentType: fichier.type });

  if (uploadError) {
    return { erreur: `Envoi du fichier impossible : ${uploadError.message}` };
  }

  await prisma.document.create({
    data: {
      titre: titre.trim(),
      categorie: categorie as CategorieDocument,
      cheminFichier,
      nomFichierOriginal: fichier.name,
      ajouteParId: utilisateur.id,
    },
  });

  return { succes: true };
}
