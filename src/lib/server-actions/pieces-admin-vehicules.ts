"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import { ajouterPieceAdministrativeSchema } from "@/types/validations/vehicules";

async function requireAccesPiecesAdmin() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "pieces-admin-vehicules");
  return utilisateur;
}

/// Premier Utilisateur actif avec accès logistique/magasins — même
/// résolution que partout ailleurs dans ce module (Livraison A).
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

export async function listerTypesPiecesAdministratives() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  return prisma.typePieceAdministrative.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
}

export async function ajouterPieceAdministrative(
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesPiecesAdmin();

  const analyse = ajouterPieceAdministrativeSchema.safeParse({
    vehiculeId: formData.get("vehiculeId"),
    typePieceId: formData.get("typePieceId"),
    dateEmission: formData.get("dateEmission") || undefined,
    dateExpiration: formData.get("dateExpiration") || undefined,
  });
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  let cheminFichier: string | null = null;
  let nomFichierOriginal: string | null = null;

  const fichier = formData.get("fichier");
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > TAILLE_MAX_OCTETS) return { erreur: "Fichier trop volumineux (max 20 Mo)." };
    if (!MIME_TYPES_AUTORISES.includes(fichier.type)) return { erreur: "Type de fichier non autorisé." };

    const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
    cheminFichier = `pieces-admin-vehicules/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
    nomFichierOriginal = fichier.name;

    const supabaseAdmin = createAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(cheminFichier, fichier, { contentType: fichier.type });
    if (uploadError) return { erreur: `Envoi du fichier impossible : ${uploadError.message}` };
  }

  await prisma.pieceAdministrativeVehicule.create({
    data: {
      vehiculeId: donnees.vehiculeId,
      typePieceId: donnees.typePieceId,
      dateEmission: donnees.dateEmission ? new Date(donnees.dateEmission) : null,
      dateExpiration: donnees.dateExpiration ? new Date(donnees.dateExpiration) : null,
      cheminFichier,
      nomFichierOriginal,
    },
  });

  return { succes: true };
}

export async function listerPiecesAdministratives(vehiculeId?: string) {
  await requireAccesPiecesAdmin();

  return prisma.pieceAdministrativeVehicule.findMany({
    where: vehiculeId ? { vehiculeId } : undefined,
    include: { vehicule: true, typePiece: true },
    orderBy: { dateExpiration: "asc" },
  });
}

export async function obtenirUrlPieceAdministrative(cheminFichier: string): Promise<string | null> {
  await requireAccesPiecesAdmin();
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(cheminFichier, 300);
  return data?.signedUrl ?? null;
}

/**
 * Détection page-level (pas dashboard/layout.tsx) — même justification que
 * seuil-alerte (Livraison A) : l'expiration d'une pièce n'est pas adressée
 * à un destinataire personnel comme les échéances projet du Lot 5. Alerte
 * toujours envoyée au Logisticien résolu, pas à l'utilisateur courant —
 * pas de paramètre utilisateur nécessaire ici (contrairement à
 * verifierEtCreerDemandesReapprovisionnement, qui attribue l'acteur d'un
 * enregistrerTransition() ; cette fonction ne crée que des Notification).
 * Fenêtre de 30 jours avant expiration.
 */
export async function verifierEtCreerAlertesExpirationPieces(): Promise<void> {
  const dansTrenteJours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const pieces = await prisma.pieceAdministrativeVehicule.findMany({
    where: { dateExpiration: { lte: dansTrenteJours, not: null } },
    include: { vehicule: true, typePiece: true },
  });
  if (pieces.length === 0) return;

  const logisticien = await resoudreLogisticien();
  if (!logisticien) return;

  await prisma.notification.createMany({
    data: pieces.map((piece) => ({
      destinataireId: logisticien.id,
      titre: `${piece.dateExpiration! < new Date() ? "Expirée" : "Expiration proche"} — ${piece.typePiece.nom} (${piece.vehicule.immatriculation})`,
      description: `Échéance : ${piece.dateExpiration!.toLocaleDateString("fr-FR")}`,
      entiteType: "PieceAdministrativeVehicule",
      entiteId: piece.id,
      lienDetail: "/dashboard/logistique/pieces-admin-vehicules",
    })),
    skipDuplicates: true,
  });
}
