"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";
import { upsertDemandeIndex } from "@/lib/server-actions/demande-index";
import { peutValiderRH, resoudreResponsableRH } from "@/lib/server-actions/rh-partage";
import {
  creerReleveActiviteSchema,
  type CreerReleveActiviteInput,
} from "@/types/validations/rh";

const TYPE_MODULE = "rh";
const SOUS_MODULE = "releve-activite";
const LIEN_DETAIL = "/dashboard/rh/releve-activite";

async function requireAccesReleveActivite() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "rh", "releve-activite");
  return utilisateur;
}

export async function creerReleveActivite(
  input: CreerReleveActiviteInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesReleveActivite();

  const analyse = creerReleveActiviteSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const responsable = await resoudreResponsableRH();
  if (!responsable) {
    return {
      erreur: "Aucun responsable RH actif n'est configuré — impossible de créer le relevé.",
    };
  }

  const affectation = await prisma.affectationProjet.findFirst({
    where: { ouvrierId: donnees.ouvrierId, projetId: donnees.projetId },
  });
  if (!affectation) {
    return { erreur: "Cet ouvrier n'est pas affecté à ce projet." };
  }

  const releve = await prisma.releveActivite.create({
    data: {
      ouvrierId: donnees.ouvrierId,
      projetId: donnees.projetId,
      periode: donnees.periode,
      joursTravailles: donnees.joursTravailles,
      saisiParId: utilisateur.id,
    },
  });

  await enregistrerTransition({
    entiteType: "ReleveActivite",
    entiteId: releve.id,
    statutNouveau: "SOUMIS",
    acteurId: utilisateur.id,
  });

  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "ReleveActivite",
    entiteId: releve.id,
    demandeurId: donnees.ouvrierId,
    statutLibelle: "En attente de validation RH",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: responsable.id,
    lienDetail: LIEN_DETAIL,
    dateSoumission: releve.dateCreation,
  });

  return { succes: true };
}

export async function validerReleveActivite(
  releveId: string,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) redirect("/dashboard");

  const releve = await prisma.releveActivite.findUnique({ where: { id: releveId } });
  if (!releve) return { erreur: "Relevé introuvable." };
  if (releve.statut !== "SOUMIS") {
    return { erreur: "Ce relevé n'est plus en attente de validation." };
  }

  await prisma.releveActivite.update({ where: { id: releveId }, data: { statut: "VALIDE_RH" } });

  await enregistrerTransition({
    entiteType: "ReleveActivite",
    entiteId: releve.id,
    statutPrecedent: "SOUMIS",
    statutNouveau: "VALIDE_RH",
    acteurId: utilisateur.id,
  });
  await upsertDemandeIndex({
    typeModule: TYPE_MODULE,
    sousModule: SOUS_MODULE,
    reference: null,
    entiteType: "ReleveActivite",
    entiteId: releve.id,
    demandeurId: releve.ouvrierId,
    statutLibelle: "Validée par les Ressources Humaines",
    montant: null,
    enAttenteValidationDe: null,
    enAttenteValidationUtilisateurId: null,
    lienDetail: LIEN_DETAIL,
    dateSoumission: releve.dateCreation,
  });

  return { succes: true };
}

export async function listerReleves() {
  await requireAccesReleveActivite();

  return prisma.releveActivite.findMany({
    include: {
      ouvrier: { select: { nom: true, prenom: true } },
      saisiPar: { select: { nom: true, prenom: true } },
      projet: { select: { nom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function listerAValiderReleves() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  if (!(await peutValiderRH(utilisateur.id))) return [];

  return prisma.releveActivite.findMany({
    where: { statut: "SOUMIS" },
    include: {
      ouvrier: { select: { nom: true, prenom: true } },
      saisiPar: { select: { nom: true, prenom: true } },
      projet: { select: { nom: true } },
    },
    orderBy: { dateCreation: "asc" },
  });
}
