"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import {
  creerBonEntreeMagasinSchema,
  validerBonEntreeMagasinSchema,
  type CreerBonEntreeMagasinInput,
  type ValiderBonEntreeMagasinInput,
} from "@/types/validations/logistique";

const TYPE_MODULE = "logistique";
const SOUS_MODULE = "flux-entree";
const LIEN_DETAIL = "/dashboard/logistique/flux-entree";

async function requireAccesFluxEntree() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "flux-entree");
  return utilisateur;
}

async function peutValiderBEM(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

/**
 * Premier Utilisateur actif avec accès logistique/magasins — même
 * résolution que flux-sortie.ts/demande-materiel.ts.
 */
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

/**
 * Réceptionné par (Chef Magasin) : auto-attribué au créateur, pas de
 * routage nommé — enregistrer une livraison n'est pas une demande adressée
 * à quelqu'un. C'est la validation, pas la création, qui met à jour la
 * fiche inventaire (cf. CLAUDE.md).
 */
export async function creerBonEntreeMagasin(
  input: CreerBonEntreeMagasinInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesFluxEntree();

  const analyse = creerBonEntreeMagasinSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const logisticien = await resoudreLogisticien();
  if (!logisticien) {
    return {
      erreur: "Aucun Responsable Service Logistique actif n'est configuré — impossible de continuer.",
    };
  }

  const bem = await prisma.bonEntreeMagasin.create({
    data: {
      demandeReapprovisionnementId: donnees.demandeReapprovisionnementId || null,
      bonLivraisonFournisseurNumero: donnees.bonLivraisonFournisseurNumero,
      dateReception: new Date(donnees.dateReception),
      magasinId: donnees.magasinId,
      fournisseur: donnees.fournisseur,
      receptionneParId: utilisateur.id,
      lignes: {
        create: donnees.lignes.map((ligne) => ({
          materielId: ligne.materielId,
          quantiteRecue: ligne.quantiteRecue,
        })),
      },
    },
  });

  await enregistrerTransition({
    entiteType: "BonEntreeMagasin",
    entiteId: bem.id,
    statutNouveau: "EN_ATTENTE_VALIDATION",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `BEM-${String(bem.numero).padStart(5, "0")}`,
    entiteType: "BonEntreeMagasin",
    entiteId: bem.id,
    demandeurId: utilisateur.id,
    statutLibelle: "En attente de validation du Logisticien",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: logisticien.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: bem.dateCreation,
  });

  return { succes: true };
}

export async function validerBonEntreeMagasin(
  input: ValiderBonEntreeMagasinInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderBEM(utilisateur.id))) redirect("/dashboard");

  const analyse = validerBonEntreeMagasinSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const bem = await prisma.bonEntreeMagasin.findUnique({
    where: { id: donnees.bemId },
    include: { lignes: true },
  });
  if (!bem) return { erreur: "Bon d'entrée introuvable." };
  if (bem.statut !== "EN_ATTENTE_VALIDATION") {
    return { erreur: "Ce bon d'entrée n'est plus en attente de validation." };
  }

  await prisma.$transaction(async (tx) => {
    for (const ligne of bem.lignes) {
      const materiel = await tx.materiel.update({
        where: { id: ligne.materielId },
        data: { quantiteStock: { increment: ligne.quantiteRecue } },
      });
      await tx.mouvementStock.create({
        data: {
          materielId: ligne.materielId,
          type: "ENTREE",
          quantite: ligne.quantiteRecue,
          quantiteApresMouvement: materiel.quantiteStock ?? 0,
          motif: bem.fournisseur,
          effectueParId: utilisateur.id,
        },
      });
    }

    await tx.bonEntreeMagasin.update({
      where: { id: donnees.bemId },
      data: {
        statut: "VALIDE",
        conformite: donnees.conformite,
        reserves: donnees.reserves || null,
        actionEcart: donnees.actionEcart || null,
        valideParId: utilisateur.id,
        dateValidation: new Date(),
      },
    });
  });

  await enregistrerTransition({
    entiteType: "BonEntreeMagasin",
    entiteId: bem.id,
    statutPrecedent: "EN_ATTENTE_VALIDATION",
    statutNouveau: "VALIDE",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: `BEM-${String(bem.numero).padStart(5, "0")}`,
    entiteType: "BonEntreeMagasin",
    entiteId: bem.id,
    demandeurId: bem.receptionneParId ?? utilisateur.id,
    statutLibelle: "Validé",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: bem.dateCreation,
  });

  return { succes: true };
}

export async function listerBonsEntreeMagasin() {
  await requireAccesFluxEntree();

  return prisma.bonEntreeMagasin.findMany({
    include: {
      magasin: true,
      receptionnePar: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderBEM() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderBEM(utilisateur.id))) return [];

  return prisma.bonEntreeMagasin.findMany({
    where: { statut: "EN_ATTENTE_VALIDATION" },
    include: {
      magasin: true,
      receptionnePar: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
    },
    orderBy: { dateCreation: "asc" },
  });
}
