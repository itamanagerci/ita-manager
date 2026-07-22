"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUtilisateur, peutValiderDirectionGenerale } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import {
  creerDemandeAppelOffresSchema,
  refuserAppelOffresSchema,
} from "@/types/validations/direction-technique";

const TYPE_MODULE = "direction-technique";
const SOUS_MODULE = "appel-offres";
const LIEN_DETAIL = "/dashboard/direction-technique/appel-offres";

async function requireAccesAppelOffres() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "direction-technique", "appel-offres");
  return utilisateur;
}

export async function creerDemandeAppelOffres(
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesAppelOffres();

  const analyse = creerDemandeAppelOffresSchema.safeParse({
    nom: formData.get("nom"),
    client: formData.get("client"),
    montantEstime: Number(formData.get("montantEstime")),
    description: formData.get("description"),
    delaiReponse: formData.get("delaiReponse"),
  });
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const fichiers = formData.getAll("pieceJointe").filter((f): f is File => f instanceof File && f.size > 0);
  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX_OCTETS) {
      return { erreur: "Une pièce jointe dépasse la taille maximale autorisée (20 Mo)." };
    }
    if (!MIME_TYPES_AUTORISES.includes(fichier.type)) {
      return { erreur: `Type de fichier non autorisé : ${fichier.name}.` };
    }
  }

  const demande = await prisma.demandeAppelOffres.create({
    data: {
      nom: donnees.nom,
      client: donnees.client,
      montantEstime: donnees.montantEstime,
      description: donnees.description,
      delaiReponse: new Date(donnees.delaiReponse),
      initiateurId: utilisateur.id,
    },
  });

  if (fichiers.length > 0) {
    const supabaseAdmin = createAdminClient();
    for (const fichier of fichiers) {
      const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
      const cheminFichier = `appel-offres/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(cheminFichier, fichier, { contentType: fichier.type });
      if (uploadError) continue;

      await prisma.pieceJointeAppelOffres.create({
        data: { demandeId: demande.id, cheminFichier, nomFichierOriginal: fichier.name },
      });
    }
  }

  await enregistrerTransition({
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_DG",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de la Direction Générale",
    montant: donnees.montantEstime,
    enAttenteValidationDe: "DIRECTEUR",
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerAppelOffres(
  demandeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) redirect("/dashboard");

  const demande = await prisma.demandeAppelOffres.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DG") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeAppelOffres.update({ where: { id: demandeId }, data: { statut: "VALIDE" } });

  await enregistrerTransition({
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DG",
    statutNouveau: "VALIDE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    demandeurId: demande.initiateurId,
    statutLibelle: "Appel d'offres validé",
    montant: demande.montantEstime,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserAppelOffres(
  demandeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserAppelOffresSchema.safeParse({ demandeId: demandeIdInput, motif: motifInput });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { demandeId, motif } = analyse.data;

  const demande = await prisma.demandeAppelOffres.findUnique({ where: { id: demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DG") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.demandeAppelOffres.update({
    where: { id: demandeId },
    data: { statut: "REFUSE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DG",
    statutNouveau: "REFUSE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "DemandeAppelOffres",
    entiteId: demande.id,
    demandeurId: demande.initiateurId,
    statutLibelle: "Appel d'offres refusé",
    montant: demande.montantEstime,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerDemandesAppelOffres() {
  await requireAccesAppelOffres();

  return prisma.demandeAppelOffres.findMany({
    include: {
      initiateur: { select: { nom: true, prenom: true } },
      piecesJointes: true,
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderAppelOffres() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) return [];

  return prisma.demandeAppelOffres.findMany({
    where: { statut: "EN_ATTENTE_DG" },
    include: {
      initiateur: { select: { nom: true, prenom: true } },
      piecesJointes: true,
    },
    orderBy: { dateCreation: "asc" },
  });
}

export async function obtenirUrlPieceJointe(cheminFichier: string): Promise<string | null> {
  await requireAccesAppelOffres();
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(cheminFichier, 300);
  return data?.signedUrl ?? null;
}
