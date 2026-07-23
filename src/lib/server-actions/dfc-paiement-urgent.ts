"use server";

import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, peutValiderDirectionGenerale } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { appellerApiWaveSimulee } from "@/lib/paiement-urgent-wave";
import {
  demanderCodeAutorisationSchema,
  refuserCodeAutorisationSchema,
  executerPaiementUrgentSchema,
  type DemanderCodeAutorisationInput,
  type ExecuterPaiementUrgentInput,
} from "@/types/validations/dfc";

const TYPE_MODULE = "dfc";
const SOUS_MODULE = "paiement-urgent-wave";
const LIEN_DETAIL = "/dashboard/dfc/paiement-urgent-wave";

async function requireAccesPaiementUrgent() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "dfc", "paiement-urgent-wave");
  return utilisateur;
}

/**
 * Étape 1 : demande de code par DFC, diffusée à la Direction Générale
 * (même sentinel de diffusion que DemandeAppelOffres — n'importe quel
 * détenteur réel de direction-generale/validations-centralisees peut
 * agir). Refuse un doublon si une demande/un code encore vivant existe
 * déjà pour ce demandeur — un code VALIDE mais expiré est basculé
 * EXPIRE de façon opportuniste (cosmétique, cf. schema.prisma) puis la
 * nouvelle demande est autorisée.
 */
export async function demanderCodeAutorisation(
  input: DemanderCodeAutorisationInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPaiementUrgent();

  const analyse = demanderCodeAutorisationSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const codeExistant = await prisma.codeAutorisationPaiementUrgent.findFirst({
    where: { demandeurId: utilisateur.id, statut: { in: ["EN_ATTENTE_DG", "VALIDE"] } },
    orderBy: { dateCreation: "desc" },
  });

  if (codeExistant) {
    const expire = codeExistant.dateExpiration != null && codeExistant.dateExpiration <= new Date();
    if (codeExistant.statut === "EN_ATTENTE_DG" || !expire) {
      return {
        erreur:
          codeExistant.statut === "EN_ATTENTE_DG"
            ? "Une demande de code est déjà en attente de validation par la Direction Générale."
            : "Un code d'autorisation valide existe déjà — utilisez-le avant d'en redemander un nouveau.",
      };
    }
    await prisma.codeAutorisationPaiementUrgent.update({
      where: { id: codeExistant.id },
      data: { statut: "EXPIRE" },
    });
  }

  const demande = await prisma.codeAutorisationPaiementUrgent.create({
    data: { demandeurId: utilisateur.id, justification: donnees.justification },
  });

  await enregistrerTransition({
    entiteType: "CodeAutorisationPaiementUrgent",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_DG",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "CodeAutorisationPaiementUrgent",
    entiteId: demande.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de la Direction Générale",
    montant: null,
    enAttenteValidationDe: "DIRECTEUR",
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function validerCodeAutorisation(
  codeId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) redirect("/dashboard");

  const demande = await prisma.codeAutorisationPaiementUrgent.findUnique({ where: { id: codeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DG") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  const dateValidation = new Date();
  const dateExpiration = new Date(dateValidation.getTime() + 24 * 60 * 60 * 1000);
  const code = randomInt(100000, 1000000).toString();

  await prisma.codeAutorisationPaiementUrgent.update({
    where: { id: codeId },
    data: { statut: "VALIDE", code, valideParId: utilisateur.id, dateValidation, dateExpiration },
  });

  await enregistrerTransition({
    entiteType: "CodeAutorisationPaiementUrgent",
    entiteId: demande.id,
    statutPrecedent: "EN_ATTENTE_DG",
    statutNouveau: "VALIDE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "CodeAutorisationPaiementUrgent",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Code d'autorisation validé",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function refuserCodeAutorisation(
  codeIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) redirect("/dashboard");

  const analyse = refuserCodeAutorisationSchema.safeParse({
    codeId: codeIdInput,
    motif: motifInput,
  });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { codeId, motif } = analyse.data;

  const demande = await prisma.codeAutorisationPaiementUrgent.findUnique({ where: { id: codeId } });
  if (!demande) return { erreur: "Demande introuvable." };
  if (demande.statut !== "EN_ATTENTE_DG") {
    return { erreur: "Cette demande n'est plus en attente de validation." };
  }

  await prisma.codeAutorisationPaiementUrgent.update({
    where: { id: codeId },
    data: { statut: "REFUSE", motifRefus: motif },
  });

  await enregistrerTransition({
    entiteType: "CodeAutorisationPaiementUrgent",
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
    entiteType: "CodeAutorisationPaiementUrgent",
    entiteId: demande.id,
    demandeurId: demande.demandeurId,
    statutLibelle: "Code d'autorisation refusé",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });

  return { succes: true };
}

export async function listerCodesAValider() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderDirectionGenerale(utilisateur.id))) return [];

  return prisma.codeAutorisationPaiementUrgent.findMany({
    where: { statut: "EN_ATTENTE_DG" },
    include: { demandeur: { select: { nom: true, prenom: true } } },
    orderBy: { dateCreation: "asc" },
  });
}

/** Liste légère pour le sélecteur de bénéficiaire (Utilisateur) du formulaire d'exécution. */
export async function listerBeneficiairesUtilisateurs() {
  await requireAccesPaiementUrgent();
  return prisma.utilisateur.findMany({
    where: { statut: "ACTIF" },
    select: { id: true, nom: true, prenom: true, numeroWave: true },
    orderBy: { nom: "asc" },
  });
}

export async function listerMesCodes() {
  const utilisateur = await requireAccesPaiementUrgent();

  return prisma.codeAutorisationPaiementUrgent.findMany({
    where: { demandeurId: utilisateur.id },
    orderBy: { dateCreation: "desc" },
    take: 10,
  });
}

/**
 * Étape 4-5 : écran de confirmation déjà validé côté client (récapitulatif
 * + case à cocher) — ici, revérification complète côté serveur, jamais de
 * confiance dans ce que le client a affiché. Le code est consommé de façon
 * atomique AVANT la création de PaiementUrgent (garde updateMany
 * count===1) : c'est cet ordre qui garantit qu'une tentative de réemploi
 * du même code échoue toujours, même sous course concurrente. Cf.
 * CLAUDE.md.
 */
export async function executerPaiementUrgent(
  input: ExecuterPaiementUrgentInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesPaiementUrgent();

  const analyse = executerPaiementUrgentSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const code = await prisma.codeAutorisationPaiementUrgent.findFirst({
    where: { code: donnees.codeSaisi, demandeurId: utilisateur.id, statut: "VALIDE" },
  });
  if (!code) return { erreur: "Code introuvable ou déjà utilisé." };
  if (!code.dateExpiration || code.dateExpiration <= new Date()) {
    return { erreur: "Ce code a expiré — demandez-en un nouveau." };
  }

  let nomBeneficiaire: string;
  let numeroWave: string | null;
  if (donnees.beneficiaireUtilisateurId) {
    const beneficiaire = await prisma.utilisateur.findUnique({
      where: { id: donnees.beneficiaireUtilisateurId },
    });
    if (!beneficiaire) return { erreur: "Bénéficiaire introuvable." };
    nomBeneficiaire = `${beneficiaire.prenom} ${beneficiaire.nom}`;
    numeroWave = beneficiaire.numeroWave;
  } else {
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: donnees.beneficiaireFournisseurId },
    });
    if (!fournisseur) return { erreur: "Fournisseur introuvable." };
    nomBeneficiaire = fournisseur.nom;
    numeroWave = fournisseur.numeroWave;
  }

  if (!numeroWave) {
    return {
      erreur: "Numéro Wave requis pour ce bénéficiaire — renseignez-le avant d'exécuter ce paiement.",
    };
  }

  const { referenceSimulee } = appellerApiWaveSimulee(nomBeneficiaire, donnees.montant);

  const consomme = await prisma.codeAutorisationPaiementUrgent.updateMany({
    where: { id: code.id, statut: "VALIDE" },
    data: { statut: "UTILISE", dateUtilisation: new Date() },
  });
  if (consomme.count !== 1) {
    return { erreur: "Ce code vient d'être utilisé par une autre tentative — action annulée." };
  }

  const paiementUrgent = await prisma.paiementUrgent.create({
    data: {
      codeAutorisationId: code.id,
      beneficiaireUtilisateurId: donnees.beneficiaireUtilisateurId || null,
      beneficiaireFournisseurId: donnees.beneficiaireFournisseurId || null,
      montant: donnees.montant,
      executeParId: utilisateur.id,
      referenceSimulee,
    },
  });

  await enregistrerTransition({
    entiteType: "PaiementUrgent",
    entiteId: paiementUrgent.id,
    statutNouveau: "EXECUTE",
    acteurId: utilisateur.id,
  });

  return { succes: true };
}

export async function listerPaiementsUrgentsEffectues() {
  await requireAccesPaiementUrgent();

  return prisma.paiementUrgent.findMany({
    include: {
      beneficiaireUtilisateur: { select: { nom: true, prenom: true } },
      beneficiaireFournisseur: { select: { nom: true } },
      executePar: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateExecution: "desc" },
  });
}
