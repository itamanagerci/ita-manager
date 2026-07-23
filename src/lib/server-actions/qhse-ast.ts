"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { creerASTSchema, validerASTSchema, type CreerASTInput } from "@/types/validations/qhse";

async function requireAccesAST() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "ast");
  return utilisateur;
}

export async function peutValiderAST(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "qhse", "ast");
}

export async function creerAST(input: CreerASTInput): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesAST();

  const analyse = creerASTSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  await prisma.ficheAST.create({
    data: {
      projetId: donnees.projetId || null,
      chantierLibre: donnees.chantierLibre || null,
      chefChantierId: utilisateur.id,
      dateSignatureChefChantier: new Date(),
      taches: {
        create: donnees.taches.map((tache, ordre) => ({
          ordre,
          ressources: tache.ressources,
          risques: tache.risques,
          mesuresPrevention: tache.mesuresPrevention,
        })),
      },
    },
  });

  return { succes: true };
}

export async function listerFichesAST() {
  await requireAccesAST();

  return prisma.ficheAST.findMany({
    include: {
      chefChantier: { select: { nom: true, prenom: true } },
      relaisQHSE: { select: { nom: true, prenom: true } },
      taches: true,
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirFicheAST(id: string) {
  await requireAccesAST();

  return prisma.ficheAST.findUnique({
    where: { id },
    include: {
      chefChantier: { select: { nom: true, prenom: true } },
      relaisQHSE: { select: { nom: true, prenom: true } },
      taches: { orderBy: { ordre: "asc" } },
    },
  });
}

/**
 * "Chef de chantier" et "Responsable QHSE" ont tous les deux accès à
 * qhse/ast — sans cette garde acteurId!==chefChantierId, un Chef de
 * chantier pourrait valider sa propre AST. Cf. CLAUDE.md.
 */
export async function validerAST(
  astIdInput: string,
  decisionInput: "VALIDEE" | "REFUSEE",
  motifRefusInput?: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderAST(utilisateur.id))) redirect("/dashboard");

  const analyse = validerASTSchema.safeParse({
    astId: astIdInput,
    decision: decisionInput,
    motifRefus: motifRefusInput,
  });
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const fiche = await prisma.ficheAST.findUnique({ where: { id: donnees.astId } });
  if (!fiche) return { erreur: "Fiche AST introuvable." };
  if (fiche.statut !== "EN_ATTENTE_VALIDATION_QHSE") {
    return { erreur: "Cette fiche n'est plus en attente de validation." };
  }
  if (utilisateur.id === fiche.chefChantierId) {
    return { erreur: "Vous ne pouvez pas valider votre propre AST — un autre membre QHSE doit intervenir." };
  }
  if (donnees.decision === "REFUSEE" && !donnees.motifRefus?.trim()) {
    return { erreur: "Le motif du refus est requis." };
  }

  await prisma.ficheAST.update({
    where: { id: donnees.astId },
    data: {
      statut: donnees.decision,
      motifRefus: donnees.decision === "REFUSEE" ? donnees.motifRefus : null,
      relaisQHSEId: utilisateur.id,
      dateSignatureRelaisQHSE: new Date(),
    },
  });

  return { succes: true };
}
