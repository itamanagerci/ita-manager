"use server";

import type { RoleValidationAchat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  possedeAccesModule,
  possedeAccesSousModule,
  peutValiderDirectionGenerale,
} from "@/lib/server-actions/acces";

/**
 * Un rôle du circuit parallèle = diffusion à quiconque a un accès réel au
 * module/sous-module correspondant, jamais une personne nommée (cf.
 * CLAUDE.md). RH/DG réutilisent les signaux déjà établis ailleurs dans le
 * projet plutôt que d'en inventer de nouveaux.
 */
async function peutValiderDT(utilisateurId: string): Promise<boolean> {
  return possedeAccesModule(utilisateurId, "direction-technique");
}

async function peutValiderRHAchat(utilisateurId: string): Promise<boolean> {
  return possedeAccesSousModule(utilisateurId, "rh", "creation-profil");
}

async function peutValiderDFC(utilisateurId: string): Promise<boolean> {
  return possedeAccesModule(utilisateurId, "dfc");
}

async function peutValiderDGAchat(utilisateurId: string): Promise<boolean> {
  return peutValiderDirectionGenerale(utilisateurId);
}

const VERIFICATEURS_PAR_ROLE: Record<
  RoleValidationAchat,
  (utilisateurId: string) => Promise<boolean>
> = {
  DT: peutValiderDT,
  RH: peutValiderRHAchat,
  DFC: peutValiderDFC,
  DG: peutValiderDGAchat,
};

export async function peutValiderRoleAchat(
  utilisateurId: string,
  role: RoleValidationAchat,
): Promise<boolean> {
  return VERIFICATEURS_PAR_ROLE[role](utilisateurId);
}

/** Sous-ensemble de DT/RH/DFC/DG pour lesquels cet utilisateur est habilité. */
export async function rolesEligibles(utilisateurId: string): Promise<RoleValidationAchat[]> {
  const roles: RoleValidationAchat[] = ["DT", "RH", "DFC", "DG"];
  const resultats = await Promise.all(roles.map((role) => peutValiderRoleAchat(utilisateurId, role)));
  return roles.filter((_, index) => resultats[index]);
}

/**
 * Premier Utilisateur actif avec accès achat/traitement-achat — même forme
 * que resoudreResponsableRH()/resoudreLogisticien() : sert uniquement à
 * router DemandeIndex vers un individu résolu (étape 3, broadcast-vers-un-
 * seul), jamais une vérification d'autorisation (peutGererComptes/
 * requireAccesModule restent les seules garde-fous réels).
 */
export async function resoudreResponsableAchat() {
  const acces = await prisma.accesUtilisateur.findFirst({
    where: {
      actif: true,
      utilisateur: { statut: "ACTIF" },
      sousModule: { code: "traitement-achat", actif: true, module: { code: "achat" } },
    },
    include: { utilisateur: true },
    orderBy: { utilisateur: { dateCreation: "asc" } },
  });
  return acces?.utilisateur ?? null;
}
