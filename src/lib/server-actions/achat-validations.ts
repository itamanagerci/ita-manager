"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { rolesEligibles, peutValiderRoleAchat } from "@/lib/server-actions/achat-partage";
import { LABEL_ROLE } from "@/lib/achat-constants";
import { emettreLignesBonDeCommande } from "@/lib/server-actions/achat-bons-commande";
import { refuserParalleleSchema } from "@/types/validations/achat";

const TYPE_MODULE = "achat";
const SOUS_MODULE = "demande-achat";
const LIEN_DETAIL = "/dashboard/achat/demande-achat";

function reference(numero: number): string {
  return `ACH-${String(numero).padStart(5, "0")}`;
}

async function requireAccesValidationsParallele() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "validations-parallele");
  return utilisateur;
}

/**
 * Inbox de diffusion unifiée : une ligne ValidationDemandeAchat par rôle
 * pour lequel cet utilisateur est habilité (cf. rolesEligibles()) — pas de
 * routage nommé. L'accès à la page (sous-module validations-parallele) ne
 * garantit rien par lui-même : l'autorisation réelle par rôle est
 * re-vérifiée indépendamment dans validerParallele()/refuserParallele().
 */
export async function listerAValiderParallele() {
  const utilisateur = await requireAccesValidationsParallele();
  const roles = await rolesEligibles(utilisateur.id);
  if (roles.length === 0) return [];

  return prisma.validationDemandeAchat.findMany({
    where: { role: { in: roles }, statut: "EN_ATTENTE" },
    include: {
      demande: {
        include: {
          demandeur: { select: { nom: true, prenom: true } },
          lignes: { include: { article: { select: { designation: true } } } },
        },
      },
    },
    orderBy: { demande: { dateCreation: "asc" } },
  });
}

export async function validerParallele(
  validationId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const validation = await prisma.validationDemandeAchat.findUnique({ where: { id: validationId } });
  if (!validation) return { erreur: "Validation introuvable." };
  if (!(await peutValiderRoleAchat(utilisateur.id, validation.role))) redirect("/dashboard");

  // Premier à agir remporte le créneau — garde atomique, même idiome que
  // les décréments de stock (Lot 6).
  const misAJour = await prisma.validationDemandeAchat.updateMany({
    where: { id: validationId, statut: "EN_ATTENTE" },
    data: { statut: "VALIDEE", valideParId: utilisateur.id, dateAction: new Date() },
  });
  if (misAJour.count === 0) {
    return { erreur: "Cette validation a déjà été traitée par un autre valideur." };
  }

  await enregistrerTransition({
    entiteType: "ValidationDemandeAchat",
    entiteId: validationId,
    statutPrecedent: "EN_ATTENTE",
    statutNouveau: "VALIDEE",
    acteurId: utilisateur.id,
  });

  await recalculerStatutDemandeAchat(validation.demandeId, utilisateur.id);

  return { succes: true };
}

export async function refuserParallele(
  validationIdInput: string,
  motifInput: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const analyse = refuserParalleleSchema.safeParse({
    validationId: validationIdInput,
    motif: motifInput,
  });
  if (!analyse.success) return { erreur: "Motif requis." };
  const { validationId, motif } = analyse.data;

  const validation = await prisma.validationDemandeAchat.findUnique({ where: { id: validationId } });
  if (!validation) return { erreur: "Validation introuvable." };
  if (!(await peutValiderRoleAchat(utilisateur.id, validation.role))) redirect("/dashboard");

  const misAJour = await prisma.validationDemandeAchat.updateMany({
    where: { id: validationId, statut: "EN_ATTENTE" },
    data: { statut: "REFUSEE", motifRefus: motif, valideParId: utilisateur.id, dateAction: new Date() },
  });
  if (misAJour.count === 0) {
    return { erreur: "Cette validation a déjà été traitée par un autre valideur." };
  }

  await enregistrerTransition({
    entiteType: "ValidationDemandeAchat",
    entiteId: validationId,
    statutPrecedent: "EN_ATTENTE",
    statutNouveau: "REFUSEE",
    acteurId: utilisateur.id,
    commentaire: motif,
  });

  await recalculerStatutDemandeAchat(validation.demandeId, utilisateur.id);

  return { succes: true };
}

/**
 * Recalcule DemandeAchat.statut après chaque décision individuelle : un
 * seul refus bloque tout (etapeBlocage=VALIDATION_PARALLELE, resoumission
 * via achat-traitement.ts), tous doivent valider pour émettre le BC. Garde
 * atomique (updateMany conditionné sur le statut courant, count===1) contre
 * la course "deux rôles résolvent quasi simultanément" — même idiome que
 * les décréments de stock. Cf. CLAUDE.md.
 */
export async function recalculerStatutDemandeAchat(
  demandeId: string,
  acteurId: string,
): Promise<void> {
  const demande = await prisma.demandeAchat.findUniqueOrThrow({
    where: { id: demandeId },
    include: { validations: true },
  });
  if (demande.statut !== "EN_ATTENTE_VALIDATION_PARALLELE") return;

  const refusee = demande.validations.find((v) => v.statut === "REFUSEE");
  if (refusee) {
    const transition = await prisma.demandeAchat.updateMany({
      where: { id: demandeId, statut: "EN_ATTENTE_VALIDATION_PARALLELE" },
      data: {
        statut: "REFUSEE",
        etapeBlocage: "VALIDATION_PARALLELE",
        motifRefus: refusee.motifRefus,
      },
    });
    if (transition.count === 1) {
      await enregistrerTransition({
        entiteType: "DemandeAchat",
        entiteId: demandeId,
        statutPrecedent: "EN_ATTENTE_VALIDATION_PARALLELE",
        statutNouveau: "REFUSEE",
        acteurId,
        commentaire: refusee.motifRefus ?? undefined,
      });
      await upsertDemandeIndex({
        typeModule: TYPE_MODULE,
        sousModule: SOUS_MODULE,
        reference: reference(demande.numero),
        entiteType: "DemandeAchat",
        entiteId: demandeId,
        demandeurId: demande.demandeurId,
        statutLibelle: "Refusée en validation parallèle",
        montant: demande.montantTotalTTC,
        enAttenteValidationDe: null,
        enAttenteValidationUtilisateurId: null,
        lienDetail: LIEN_DETAIL,
        dateSoumission: demande.dateCreation,
      });
    }
    return;
  }

  const toutesValidees =
    demande.validations.length > 0 && demande.validations.every((v) => v.statut === "VALIDEE");
  if (toutesValidees) {
    const transition = await prisma.demandeAchat.updateMany({
      where: { id: demandeId, statut: "EN_ATTENTE_VALIDATION_PARALLELE" },
      data: { statut: "BC_EMIS" },
    });
    if (transition.count === 1) {
      await emettreLignesBonDeCommande(demandeId);
      await enregistrerTransition({
        entiteType: "DemandeAchat",
        entiteId: demandeId,
        statutPrecedent: "EN_ATTENTE_VALIDATION_PARALLELE",
        statutNouveau: "BC_EMIS",
        acteurId,
        commentaire:
          "Tous les validateurs requis ont validé — Bon de Commande émis. Le Lot 8 (DFC) reprendra ce BC à ce statut pour la facturation/le paiement.",
      });
      await upsertDemandeIndex({
        typeModule: TYPE_MODULE,
        sousModule: SOUS_MODULE,
        reference: reference(demande.numero),
        entiteType: "DemandeAchat",
        entiteId: demandeId,
        demandeurId: demande.demandeurId,
        statutLibelle: "Validée — Bon de Commande émis",
        montant: demande.montantTotalTTC,
        enAttenteValidationDe: null,
        enAttenteValidationUtilisateurId: null,
        lienDetail: LIEN_DETAIL,
        dateSoumission: demande.dateCreation,
      });
    }
    return;
  }

  // Encore en attente — aucun NiveauHierarchique/individu unique ne peut
  // représenter "DT+DG en attente" simultanément : sentinel non-null
  // préservant le signal binaire (jamais lu comme "traité"), l'autorisation
  // réelle reste toujours re-vérifiée par rôle dans validerParallele()/
  // refuserParallele(), jamais déléguée à ce signal. Cf. CLAUDE.md.
  const rolesEnAttente = demande.validations
    .filter((v) => v.statut === "EN_ATTENTE")
    .map((v) => LABEL_ROLE[v.role])
    .join(", ");
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: reference(demande.numero),
    entiteType: "DemandeAchat",
    entiteId: demandeId,
    demandeurId: demande.demandeurId,
    statutLibelle: `En attente de validation parallèle (${rolesEnAttente})`,
    montant: demande.montantTotalTTC,
    enAttenteValidationDe: "DIRECTEUR",
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: demande.dateCreation,
  });
}
