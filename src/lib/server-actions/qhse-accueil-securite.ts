"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  completerAccueilSecuriteSchema,
  type CompleterAccueilSecuriteInput,
} from "@/types/validations/qhse";

async function requireAccesAccueilSecurite() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "qhse", "accueil-securite");
  return utilisateur;
}

/**
 * Flux 1 — les fiches sont créées automatiquement par
 * initialiserAccueilSecurite() (user-provisioning.ts) à la création de
 * chaque compte. Cette liste sert à repérer celles encore EN_ATTENTE.
 */
export async function listerAccueilsSecurite() {
  await requireAccesAccueilSecurite();

  return prisma.accueilSecurite.findMany({
    include: {
      utilisateur: { select: { nom: true, prenom: true, fonction: { select: { nom: true } } } },
      responsableAccueil: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export async function obtenirAccueilSecurite(id: string) {
  await requireAccesAccueilSecurite();

  return prisma.accueilSecurite.findUnique({
    where: { id },
    include: {
      utilisateur: { select: { nom: true, prenom: true, fonction: { select: { nom: true } } } },
      responsableAccueil: { select: { nom: true, prenom: true } },
    },
  });
}

export async function completerAccueilSecurite(
  accueilId: string,
  input: CompleterAccueilSecuriteInput,
): Promise<{ erreur: string } | { succes: true }> {
  const utilisateur = await requireAccesAccueilSecurite();

  const analyse = completerAccueilSecuriteSchema.safeParse(input);
  if (!analyse.success) return { erreur: "Formulaire invalide." };
  const donnees = analyse.data;

  const accueil = await prisma.accueilSecurite.findUnique({ where: { id: accueilId } });
  if (!accueil) return { erreur: "Fiche introuvable." };
  if (accueil.statut === "EFFECTUE") return { erreur: "Cette fiche est déjà complétée." };

  await prisma.accueilSecurite.update({
    where: { id: accueilId },
    data: {
      age: donnees.age ?? null,
      statutTravailleur: donnees.statutTravailleur,
      contactsTelephone: donnees.contactsTelephone || null,
      lieuHabitation: donnees.lieuHabitation || null,
      personneContactUrgenceNom: donnees.personneContactUrgenceNom || null,
      personneContactUrgenceTelephone: donnees.personneContactUrgenceTelephone || null,
      epiRecus: donnees.epiRecus,
      autresEquipements: donnees.autresEquipements || null,
      informationsFormationsRecues: donnees.informationsFormationsRecues,
      sensibilisationsConduites: donnees.sensibilisationsConduites,
      statut: "EFFECTUE",
      dateSignatureTravailleur: new Date(),
      responsableAccueilId: utilisateur.id,
      dateSignatureResponsable: new Date(),
    },
  });

  return { succes: true };
}
