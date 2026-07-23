"use server";

import { redirect } from "next/navigation";
import type { RoleValidationAchat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { BUCKET, MIME_TYPES_AUTORISES, TAILLE_MAX_OCTETS } from "@/lib/storage-constants";
import { obtenirParametresAchat } from "@/lib/server-actions/achat-parametres";
import { emettreLignesBonDeCommande } from "@/lib/server-actions/achat-bons-commande";
import {
  traiterDemandeAchatSchema,
  mettreAJourArticleFournisseurPrixSchema,
  type TraiterDemandeAchatInput,
  type MettreAJourArticleFournisseurPrixInput,
} from "@/types/validations/achat";

const TYPE_MODULE = "achat";
const SOUS_MODULE = "demande-achat";
const LIEN_DETAIL = "/dashboard/achat/demande-achat";

function reference(numero: number): string {
  return `ACH-${String(numero).padStart(5, "0")}`;
}

async function requireAccesTraitementAchat() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");
  return utilisateur;
}

export async function obtenirDemandeAchatPourTraitement(demandeId: string) {
  await requireAccesTraitementAchat();
  return prisma.demandeAchat.findUnique({
    where: { id: demandeId },
    include: {
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { article: { select: { designation: true } } } },
    },
  });
}

export async function listerDemandesAValiderTraitement() {
  await requireAccesTraitementAchat();
  return prisma.demandeAchat.findMany({
    where: {
      OR: [
        { statut: "EN_ATTENTE_TRAITEMENT_ACHAT" },
        { statut: "REFUSEE", etapeBlocage: "VALIDATION_PARALLELE" },
      ],
    },
    include: {
      demandeur: { select: { nom: true, prenom: true } },
      lignes: { include: { article: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "asc" },
  });
}

/**
 * Cœur du traitement Achat (étape 3), partagé par la première soumission
 * ET par la resoumission après refus d'un validateur parallèle — même
 * logique de prix/fournisseur/termes/urgence/sélection des rôles dans les
 * deux cas, seule la remise à zéro des validations diffère (cf.
 * resoumettreApresRefusValidateurs()).
 */
async function appliquerTraitementAchat(
  demandeId: string,
  donnees: TraiterDemandeAchatInput,
  acteurId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const demande = await prisma.demandeAchat.findUnique({
    where: { id: demandeId },
    include: { lignes: true },
  });
  if (!demande) return { erreur: "Demande introuvable." };

  const lignesParId = new Map(demande.lignes.map((ligne) => [ligne.id, ligne]));
  for (const ligneInput of donnees.lignes) {
    if (!lignesParId.has(ligneInput.ligneId)) {
      return { erreur: "Une ligne ne correspond pas à cette demande." };
    }
  }
  if (donnees.lignes.length !== demande.lignes.length) {
    return { erreur: "Toutes les lignes de la demande doivent être renseignées." };
  }

  let montantTotalHT = 0;
  const montantsParLigne = new Map<string, number>();
  for (const ligneInput of donnees.lignes) {
    const ligne = lignesParId.get(ligneInput.ligneId)!;
    const montantLigneHT =
      ligneInput.modeTarification === "FORFAITAIRE"
        ? ligneInput.montantForfaitaire!
        : ligneInput.prixUnitaire! * ligne.quantite;
    montantsParLigne.set(ligneInput.ligneId, montantLigneHT);
    montantTotalHT += montantLigneHT;
  }
  const montantTotalTTC = montantTotalHT * (1 + donnees.tauxTva / 100);

  const parametres = await obtenirParametresAchat();
  const seuilUrgence = Number(parametres.seuilUrgence);
  if (donnees.urgent && montantTotalTTC > seuilUrgence) {
    return {
      erreur: `Le montant total (${montantTotalTTC.toLocaleString("fr-FR")} F CFA TTC) dépasse le seuil d'urgence configuré (${seuilUrgence.toLocaleString("fr-FR")} F CFA) — cette demande doit suivre le circuit standard.`,
    };
  }

  await prisma.$transaction([
    ...donnees.lignes.map((ligneInput) =>
      prisma.ligneDemandeAchat.update({
        where: { id: ligneInput.ligneId },
        data: {
          fournisseur: ligneInput.fournisseur,
          modeTarification: ligneInput.modeTarification,
          prixUnitaire: ligneInput.prixUnitaire ?? null,
          montantForfaitaire: ligneInput.montantForfaitaire ?? null,
          montantLigneHT: montantsParLigne.get(ligneInput.ligneId),
        },
      }),
    ),
    prisma.demandeAchat.update({
      where: { id: demandeId },
      data: {
        traiteParId: acteurId,
        dateTraitement: new Date(),
        dateLivraisonPrevue: new Date(donnees.dateLivraisonPrevue),
        tauxTva: donnees.tauxTva,
        typePaiement: donnees.typePaiement,
        echeancePaiementJours: donnees.echeancePaiementJours,
        montantTotalTTC,
        urgent: donnees.urgent,
        seuilUrgenceApplique: seuilUrgence,
        statut: donnees.urgent ? "BC_EMIS" : "EN_ATTENTE_VALIDATION_PARALLELE",
        motifRefus: null,
        etapeBlocage: null,
      },
    }),
    // Remise à zéro complète des validateurs — toute ligne existante pour un
    // rôle non retenu cette fois est supprimée, et resoumettreApresRefus...
    // aura déjà supprimé les lignes existantes avant d'appeler cette
    // fonction (cf. plus bas) : ici on ne fait que (re)créer les rôles
    // sélectionnés à l'état EN_ATTENTE.
    ...(donnees.urgent
      ? []
      : (donnees.rolesSelectionnes ?? []).map((role: RoleValidationAchat) =>
          prisma.validationDemandeAchat.upsert({
            where: { demandeId_role: { demandeId, role } },
            update: { statut: "EN_ATTENTE", motifRefus: null, valideParId: null, dateAction: null },
            create: { demandeId, role, statut: "EN_ATTENTE" },
          }),
        )),
  ]);

  if (donnees.urgent) {
    await emettreLignesBonDeCommande(demandeId);
    await enregistrerTransition({
      entiteType: "DemandeAchat",
      entiteId: demandeId,
      statutNouveau: "BC_EMIS",
      acteurId,
      commentaire:
        "Urgent — sous le seuil configuré, Bon de Commande émis immédiatement sans validation supplémentaire. Le Lot 8 (DFC) reprendra ce BC à ce statut pour la facturation/le paiement.",
    });
    await upsertDemandeIndex({
      typeModule: TYPE_MODULE,
      sousModule: SOUS_MODULE,
      reference: reference(demande.numero),
      entiteType: "DemandeAchat",
      entiteId: demandeId,
      demandeurId: demande.demandeurId,
      statutLibelle: "Validée — Bon de Commande émis (urgent)",
      montant: montantTotalTTC,
      enAttenteValidationDe: null,
      enAttenteValidationUtilisateurId: null,
      lienDetail: LIEN_DETAIL,
      dateSoumission: demande.dateCreation,
    });
  } else {
    await enregistrerTransition({
      entiteType: "DemandeAchat",
      entiteId: demandeId,
      statutNouveau: "EN_ATTENTE_VALIDATION_PARALLELE",
      acteurId,
      commentaire: `Validateurs sélectionnés : ${(donnees.rolesSelectionnes ?? []).join(", ")}`,
    });
    await upsertDemandeIndex({
      typeModule: TYPE_MODULE,
      sousModule: SOUS_MODULE,
      reference: reference(demande.numero),
      entiteType: "DemandeAchat",
      entiteId: demandeId,
      demandeurId: demande.demandeurId,
      statutLibelle: `En attente de validation parallèle (${(donnees.rolesSelectionnes ?? []).join(", ")})`,
      montant: montantTotalTTC,
      enAttenteValidationDe: "DIRECTEUR",
      enAttenteValidationUtilisateurId: null,
      lienDetail: LIEN_DETAIL,
      dateSoumission: demande.dateCreation,
    });
  }

  return { succes: true };
}

export async function traiterDemandeAchat(
  input: TraiterDemandeAchatInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesTraitementAchat();

  const analyse = traiterDemandeAchatSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeAchat.findUnique({ where: { id: donnees.demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_TRAITEMENT_ACHAT") {
    return { erreur: "Cette demande n'est plus en attente de traitement." };
  }

  return appliquerTraitementAchat(donnees.demandeId, donnees, utilisateur.id);
}

/**
 * Resoumission après refus d'un validateur parallèle (étape 4) : les
 * termes fixés par Achat (prix/fournisseur/échéance...) sont ce qui a pu
 * changer, donc TOUTES les lignes ValidationDemandeAchat existantes —
 * y compris celles déjà VALIDEE avant le refus — sont supprimées avant
 * d'en recréer de fraîches (EN_ATTENTE) pour les rôles à nouveau
 * sélectionnés. Une approbation donnée sur d'anciens termes ne doit jamais
 * rester valide sur des termes modifiés — même principe que
 * changerFonctionUtilisateur() ("remise à zéro complète, pas de fusion").
 * Cf. CLAUDE.md.
 */
export async function resoumettreApresRefusValidateurs(
  input: TraiterDemandeAchatInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesTraitementAchat();

  const analyse = traiterDemandeAchatSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const demande = await prisma.demandeAchat.findUnique({ where: { id: donnees.demandeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "REFUSEE" || demande.etapeBlocage !== "VALIDATION_PARALLELE") {
    return { erreur: "Cette demande n'est pas en attente de resoumission après refus d'un validateur." };
  }

  await prisma.validationDemandeAchat.deleteMany({ where: { demandeId: donnees.demandeId } });

  return appliquerTraitementAchat(donnees.demandeId, donnees, utilisateur.id);
}

export async function ajouterPieceJointeDevis(
  demandeId: string,
  formData: FormData,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesTraitementAchat();

  const fichiers = formData
    .getAll("devis")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return { erreur: "Aucun fichier fourni." };

  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX_OCTETS) {
      return { erreur: "Un devis dépasse la taille maximale autorisée (20 Mo)." };
    }
    if (!MIME_TYPES_AUTORISES.includes(fichier.type)) {
      return { erreur: `Type de fichier non autorisé : ${fichier.name}.` };
    }
  }

  const supabaseAdmin = createAdminClient();
  for (const fichier of fichiers) {
    const extension = fichier.name.includes(".") ? fichier.name.split(".").pop() : undefined;
    const cheminFichier = `achat/devis/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(cheminFichier, fichier, { contentType: fichier.type });
    if (uploadError) continue;

    await prisma.pieceJointeDevis.create({
      data: {
        demandeId,
        cheminFichier,
        nomFichierOriginal: fichier.name,
        ajouteParId: utilisateur.id,
      },
    });
  }

  return { succes: true };
}

export async function listerPiecesJointesDevis(demandeId: string) {
  await requireAccesTraitementAchat();
  const pieces = await prisma.pieceJointeDevis.findMany({ where: { demandeId } });

  const supabaseAdmin = createAdminClient();
  return Promise.all(
    pieces.map(async (piece) => {
      const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(piece.cheminFichier, 300);
      return { ...piece, urlTelechargement: data?.signedUrl ?? null };
    }),
  );
}

/**
 * Chemin d'écriture indépendant vers Article.fournisseur/prix — jamais via
 * creerArticle() (Lot 5, gaté par direction-technique/liste-articles, qui
 * ne renseigne jamais que designation/creeParId). Cf. CLAUDE.md.
 */
export async function mettreAJourArticleFournisseurPrix(
  input: MettreAJourArticleFournisseurPrixInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesTraitementAchat();

  const analyse = mettreAJourArticleFournisseurPrixSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.article.update({
    where: { id: donnees.articleId },
    data: { fournisseur: donnees.fournisseur, prix: donnees.prix },
  });

  return { succes: true };
}
