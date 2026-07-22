"use server";

import { redirect } from "next/navigation";
import type { NiveauHierarchique, StatutUtilisateur } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  changerFonctionUtilisateur,
  initialiserAccesDepuisFonction,
} from "@/lib/server-actions/user-provisioning";
import { genererMotDePasseTemporaire } from "@/lib/mot-de-passe-temporaire";
import { creerCompteSchema, type CreerCompteInput } from "@/types/validations/utilisateur";
import CompteCreeEmail from "@/emails/compte-cree";

async function requireAdminComptes() {
  const admin = await getCurrentUtilisateur();
  if (!admin) redirect("/login");
  await requireAccesModule(admin.id, "authentification-roles", "gestion-comptes-acces");
  return admin;
}

export async function creerCompteUtilisateur(
  input: CreerCompteInput,
): Promise<
  | { erreur: string }
  | {
      succes: true;
      utilisateurId: string;
      email: string;
      motDePasseTemporaire: string;
      emailEnvoye: boolean;
    }
> {
  const admin = await requireAdminComptes();

  const analyse = creerCompteSchema.safeParse(input);
  if (!analyse.success) {
    return { erreur: "Formulaire invalide." };
  }
  const donnees = analyse.data;

  const supabaseAdmin = createAdminClient();
  const motDePasseTemporaire = genererMotDePasseTemporaire();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: donnees.email,
    password: motDePasseTemporaire,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { erreur: `Création du compte impossible : ${error?.message ?? "erreur inconnue"}` };
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      authUserId: data.user.id,
      nom: donnees.nom,
      prenom: donnees.prenom,
      email: donnees.email,
      telephone: donnees.telephone || null,
      niveauHierarchique: donnees.niveauHierarchique,
      fonctionId: donnees.fonctionId,
      creeParId: admin.id,
    },
  });

  await initialiserAccesDepuisFonction(utilisateur.id, donnees.fonctionId);

  let emailEnvoye = false;
  try {
    const { error: emailError } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: donnees.email,
      subject: "Votre compte ITA Digital a été créé",
      react: CompteCreeEmail({
        prenom: donnees.prenom,
        email: donnees.email,
        motDePasseTemporaire,
        urlConnexion: process.env.NEXT_PUBLIC_APP_URL!,
      }),
    });
    emailEnvoye = !emailError;
    if (emailError) console.error("Envoi de l'email de bienvenue échoué :", emailError);
  } catch (e) {
    console.error("Envoi de l'email de bienvenue échoué :", e);
  }

  return {
    succes: true,
    utilisateurId: utilisateur.id,
    email: utilisateur.email,
    motDePasseTemporaire,
    emailEnvoye,
  };
}

export async function basculerStatutUtilisateur(
  utilisateurId: string,
  nouveauStatut: StatutUtilisateur,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAdminComptes();

  await prisma.utilisateur.update({
    where: { id: utilisateurId },
    data: { statut: nouveauStatut },
  });

  return { succes: true };
}

/**
 * Seules FK vers Utilisateur sans onDelete Cascade — les seules qui
 * bloqueraient une suppression Prisma directe avec une erreur de contrainte
 * brute. AccesUtilisateur.utilisateurId (relation "AccesDuUtilisateur") a
 * onDelete: Cascade et n'a donc pas besoin d'être vérifiée ici.
 */
async function possedeDonneesLiees(utilisateurId: string): Promise<boolean> {
  const [
    historique,
    demandesLiees,
    accesModifies,
    comptesCrees,
    documentsAjoutes,
    demandesCarburant,
    reapprovisionnements,
    estSuperieurDe,
    demandesAbsence,
    demandesMission,
    releves,
    appelsOffres,
    projetsDiriges,
    pointsCoches,
    demandesRHProjet,
    lignesContreProposees,
    affectations,
    demandesMateriel,
    articlesCrees,
    magasinsResponsable,
    demandesMiseADisposition,
    verificationsDMS,
    decisionsDMS,
    preparationsBSM,
    receptionsBSM,
    receptionsBEM,
    validationsBEM,
    comptagesInventaire,
    validationsInventaire,
    mouvementsStock,
  ] = await Promise.all([
    prisma.historiqueStatut.count({ where: { acteurId: utilisateurId } }),
    prisma.demandeIndex.count({
      where: {
        OR: [
          { demandeurId: utilisateurId },
          { enAttenteValidationUtilisateurId: utilisateurId },
        ],
      },
    }),
    prisma.accesUtilisateur.count({ where: { modifieParId: utilisateurId } }),
    prisma.utilisateur.count({ where: { creeParId: utilisateurId } }),
    prisma.document.count({ where: { ajouteParId: utilisateurId } }),
    prisma.demandeCarburant.count({ where: { demandeurId: utilisateurId } }),
    prisma.reapprovisionnement.count({ where: { effectueParId: utilisateurId } }),
    prisma.utilisateur.count({ where: { superieurId: utilisateurId } }),
    prisma.demandeAbsence.count({
      where: { OR: [{ employeId: utilisateurId }, { superieurId: utilisateurId }] },
    }),
    prisma.demandeMission.count({
      where: { OR: [{ employeConcerneId: utilisateurId }, { initiateurId: utilisateurId }] },
    }),
    prisma.releveActivite.count({
      where: { OR: [{ ouvrierId: utilisateurId }, { saisiParId: utilisateurId }] },
    }),
    prisma.demandeAppelOffres.count({ where: { initiateurId: utilisateurId } }),
    prisma.projet.count({ where: { chefProjetId: utilisateurId } }),
    prisma.pointValidation.count({ where: { cochePar: utilisateurId } }),
    prisma.demandeRHProjet.count({ where: { initiateurId: utilisateurId } }),
    prisma.ligneDemandeRHProjet.count({ where: { ouvrierContreProposeId: utilisateurId } }),
    prisma.affectationProjet.count({ where: { ouvrierId: utilisateurId } }),
    prisma.demandeMateriel.count({ where: { initiateurId: utilisateurId } }),
    prisma.article.count({ where: { creeParId: utilisateurId } }),
    prisma.magasin.count({ where: { responsableId: utilisateurId } }),
    prisma.demandeMiseADisposition.count({ where: { demandeurId: utilisateurId } }),
    prisma.demandeMiseADisposition.count({ where: { verifieParId: utilisateurId } }),
    prisma.demandeMiseADisposition.count({ where: { decideParId: utilisateurId } }),
    prisma.bonSortieMagasin.count({ where: { preparateurId: utilisateurId } }),
    prisma.bonSortieMagasin.count({ where: { recuParId: utilisateurId } }),
    prisma.bonEntreeMagasin.count({ where: { receptionneParId: utilisateurId } }),
    prisma.bonEntreeMagasin.count({ where: { valideParId: utilisateurId } }),
    prisma.sessionInventaire.count({ where: { effectueParId: utilisateurId } }),
    prisma.sessionInventaire.count({ where: { valideParId: utilisateurId } }),
    prisma.mouvementStock.count({ where: { effectueParId: utilisateurId } }),
  ]);

  return (
    historique > 0 ||
    demandesLiees > 0 ||
    accesModifies > 0 ||
    comptesCrees > 0 ||
    documentsAjoutes > 0 ||
    demandesCarburant > 0 ||
    reapprovisionnements > 0 ||
    estSuperieurDe > 0 ||
    demandesAbsence > 0 ||
    demandesMission > 0 ||
    releves > 0 ||
    appelsOffres > 0 ||
    projetsDiriges > 0 ||
    pointsCoches > 0 ||
    demandesRHProjet > 0 ||
    lignesContreProposees > 0 ||
    affectations > 0 ||
    demandesMateriel > 0 ||
    articlesCrees > 0 ||
    magasinsResponsable > 0 ||
    demandesMiseADisposition > 0 ||
    verificationsDMS > 0 ||
    decisionsDMS > 0 ||
    preparationsBSM > 0 ||
    receptionsBSM > 0 ||
    receptionsBEM > 0 ||
    validationsBEM > 0 ||
    comptagesInventaire > 0 ||
    validationsInventaire > 0 ||
    mouvementsStock > 0
  );
}

export async function supprimerUtilisateur(
  utilisateurId: string,
): Promise<{ erreur: string } | { succes: true }> {
  await requireAdminComptes();

  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!utilisateur) return { erreur: "Utilisateur introuvable." };

  if (await possedeDonneesLiees(utilisateurId)) {
    return {
      erreur:
        "Suppression impossible : ce compte est référencé par des données existantes " +
        "(historique, demandes...). Utilisez la suspension pour préserver la traçabilité.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(utilisateur.authUserId);
  const messageIndiqueDejaAbsent =
    error?.message.toLowerCase().includes("not found") ||
    error?.message.toLowerCase().includes("not exist");
  if (error && !messageIndiqueDejaAbsent) {
    return { erreur: `Suppression du compte d'authentification impossible : ${error.message}` };
  }

  await prisma.utilisateur.delete({ where: { id: utilisateurId } });

  return { succes: true };
}

export async function mettreAJourAccesIndividuels(
  utilisateurId: string,
  sousModuleIdsActifs: string[],
): Promise<{ erreur: string } | { succes: true }> {
  const admin = await requireAdminComptes();

  const [candidats, accesActuels] = await Promise.all([
    prisma.sousModule.findMany({ where: { actif: true }, select: { id: true } }),
    prisma.accesUtilisateur.findMany({
      where: { utilisateurId },
      select: { sousModuleId: true, actif: true },
    }),
  ]);

  const actuelParSousModule = new Map(accesActuels.map((a) => [a.sousModuleId, a.actif]));
  const ensembleCoche = new Set(sousModuleIdsActifs);

  const aModifier = candidats
    .map((c) => c.id)
    .filter((sousModuleId) => {
      const etatActuel = actuelParSousModule.get(sousModuleId) ?? false;
      const nouvelEtat = ensembleCoche.has(sousModuleId);
      return etatActuel !== nouvelEtat;
    });

  if (aModifier.length === 0) return { succes: true };

  await prisma.$transaction(
    aModifier.map((sousModuleId) =>
      prisma.accesUtilisateur.upsert({
        where: { utilisateurId_sousModuleId: { utilisateurId, sousModuleId } },
        update: { actif: ensembleCoche.has(sousModuleId), estException: true, modifieParId: admin.id },
        create: {
          utilisateurId,
          sousModuleId,
          actif: ensembleCoche.has(sousModuleId),
          estException: true,
          modifieParId: admin.id,
        },
      }),
    ),
  );

  return { succes: true };
}

export async function modifierFonctionEtNiveauUtilisateur(input: {
  utilisateurId: string;
  nouvelleFonctionId: string;
  nouveauNiveau: NiveauHierarchique;
  confirmerEcrasementExceptions?: boolean;
}): Promise<
  | { erreur: string }
  | { confirmationRequise: true; nombreExceptions: number }
  | { succes: true }
> {
  await requireAdminComptes();

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: input.utilisateurId },
  });
  if (!utilisateur) return { erreur: "Utilisateur introuvable." };

  const fonctionChange = utilisateur.fonctionId !== input.nouvelleFonctionId;

  if (fonctionChange) {
    const nombreExceptions = await prisma.accesUtilisateur.count({
      where: { utilisateurId: input.utilisateurId, estException: true },
    });

    if (nombreExceptions > 0 && !input.confirmerEcrasementExceptions) {
      return { confirmationRequise: true, nombreExceptions };
    }

    await changerFonctionUtilisateur(input.utilisateurId, input.nouvelleFonctionId);
  }

  await prisma.utilisateur.update({
    where: { id: input.utilisateurId },
    data: { niveauHierarchique: input.nouveauNiveau },
  });

  return { succes: true };
}
