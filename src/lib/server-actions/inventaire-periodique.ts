"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  creerSessionInventaireSchema,
  enregistrerComptageLigneSchema,
  type CreerSessionInventaireInput,
  type EnregistrerComptageLigneInput,
} from "@/types/validations/logistique";

async function requireAccesInventairePeriodique() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "inventaire-periodique");
  return utilisateur;
}

async function peutValiderInventaire(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "logistique", "magasins");
}

export async function creerSessionInventaire(
  input: CreerSessionInventaireInput,
): Promise<{ erreur: string } | { id: string }> {
  const utilisateur = await requireAccesInventairePeriodique();

  const analyse = creerSessionInventaireSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const session = await prisma.sessionInventaire.create({
    data: {
      type: donnees.type,
      magasinId: donnees.magasinId,
      equipeComptage: donnees.equipeComptage || null,
      effectueParId: utilisateur.id,
    },
  });

  return { id: session.id };
}

/** Refuse si la session est déjà clôturée — même précondition que tous les circuits de ce projet. */
export async function enregistrerComptageLigne(
  input: EnregistrerComptageLigneInput,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAccesInventairePeriodique();

  const analyse = enregistrerComptageLigneSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const session = await prisma.sessionInventaire.findUnique({ where: { id: donnees.sessionId } });
  if (!session) return { erreur: "Session introuvable." };
  if (session.statut !== "EN_COURS") return { erreur: "Cette session est déjà clôturée." };

  const materiel = await prisma.materiel.findUniqueOrThrow({ where: { id: donnees.materielId } });
  const quantiteTheorique = materiel.quantiteStock ?? 0;

  await prisma.ligneInventaire.upsert({
    where: { sessionId_materielId: { sessionId: donnees.sessionId, materielId: donnees.materielId } },
    update: {
      quantiteTheorique,
      quantitePhysique: donnees.quantitePhysique,
      ecart: donnees.quantitePhysique - quantiteTheorique,
      commentaire: donnees.commentaire || null,
    },
    create: {
      sessionId: donnees.sessionId,
      materielId: donnees.materielId,
      quantiteTheorique,
      quantitePhysique: donnees.quantitePhysique,
      ecart: donnees.quantitePhysique - quantiteTheorique,
      commentaire: donnees.commentaire || null,
    },
  });

  return { succes: true };
}

/**
 * Applique chaque écart en SET direct (pas un increment/decrement) — une
 * correction vers une vérité physiquement constatée, pas une opération
 * concurrente à protéger comme une sortie. Simplification assumée : un
 * flux-sortie survenant entre comptage et clôture serait écrasé (cf.
 * CLAUDE.md).
 */
export async function cloturerSessionInventaire(
  sessionId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderInventaire(utilisateur.id))) redirect("/dashboard");

  const session = await prisma.sessionInventaire.findUnique({
    where: { id: sessionId },
    include: { lignes: true },
  });
  if (!session) return { erreur: "Session introuvable." };
  if (session.statut !== "EN_COURS") return { erreur: "Cette session est déjà clôturée." };

  await prisma.$transaction([
    ...session.lignes
      .filter((ligne) => ligne.ecart !== 0)
      .flatMap((ligne) => [
        prisma.materiel.update({
          where: { id: ligne.materielId },
          data: { quantiteStock: ligne.quantitePhysique },
        }),
        prisma.mouvementStock.create({
          data: {
            materielId: ligne.materielId,
            type: "AJUSTEMENT",
            quantite: Math.abs(ligne.ecart),
            quantiteApresMouvement: ligne.quantitePhysique,
            motif: `Clôture session inventaire #${session.numero}`,
            effectueParId: utilisateur.id,
          },
        }),
      ]),
    prisma.sessionInventaire.update({
      where: { id: sessionId },
      data: { statut: "CLOTUREE", valideParId: utilisateur.id, dateValidation: new Date() },
    }),
  ]);

  return { succes: true };
}

export async function listerSessionsInventaire() {
  await requireAccesInventairePeriodique();

  return prisma.sessionInventaire.findMany({
    include: {
      magasin: true,
      effectuePar: { select: { nom: true, prenom: true } },
      validePar: { select: { nom: true, prenom: true } },
      lignes: true,
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirSessionInventaire(sessionId: string) {
  await requireAccesInventairePeriodique();

  return prisma.sessionInventaire.findUnique({
    where: { id: sessionId },
    include: {
      magasin: true,
      effectuePar: { select: { nom: true, prenom: true } },
      validePar: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: true } },
    },
  });
}
