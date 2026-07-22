"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { enregistrerTransition } from "@/lib/server-actions/historique";

async function requireAccesSeuilAlerte() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "seuil-alerte");
  return utilisateur;
}

/**
 * Idempotent pour un article donné (@@unique([materielId, statut])) —
 * réutilisée à la fois par la détection passive ci-dessous (page
 * seuil-alerte) et par deciderDMS() (flux-sortie.ts, decision =
 * DEMANDE_ACHAT_DECLENCHEE). Jamais wired à upsertDemandeIndex() : aucune
 * cible de routage réelle n'existe tant que le Lot 7 (Achat) n'existe pas
 * — cf. CLAUDE.md.
 */
export async function creerOuReutiliserDemandeReapprovisionnement(materielId: string, acteurId: string) {
  const existante = await prisma.demandeReapprovisionnement.findFirst({
    where: { materielId, statut: "EN_ATTENTE_ACHAT" },
  });
  if (existante) return existante;

  const materiel = await prisma.materiel.findUniqueOrThrow({ where: { id: materielId } });

  const demande = await prisma.demandeReapprovisionnement.create({
    data: {
      materielId,
      quantiteStockConstatee: materiel.quantiteStock ?? 0,
      seuilAlerteConstate: materiel.seuilAlerte ?? 0,
    },
  });

  await enregistrerTransition({
    entiteType: "DemandeReapprovisionnement",
    entiteId: demande.id,
    statutNouveau: "EN_ATTENTE_ACHAT",
    acteurId,
  });

  return demande;
}

/**
 * Détection passive au chargement de la page seuil-alerte — pas depuis
 * dashboard/layout.tsx : un stock sous seuil n'est adressé à personne en
 * particulier, contrairement aux échéances projet du Lot 5. Cf. CLAUDE.md.
 */
export async function verifierEtCreerDemandesReapprovisionnement(utilisateurId: string): Promise<void> {
  const materielsSousSeuil = await prisma.materiel.findMany({
    where: { magasinId: { not: null }, seuilAlerte: { not: null }, quantiteStock: { not: null } },
  });

  for (const materiel of materielsSousSeuil) {
    if (materiel.quantiteStock! <= materiel.seuilAlerte!) {
      await creerOuReutiliserDemandeReapprovisionnement(materiel.id, utilisateurId);
    }
  }
}

export async function listerMaterielsSousSeuil() {
  await requireAccesSeuilAlerte();

  const materiels = await prisma.materiel.findMany({
    where: { magasinId: { not: null }, seuilAlerte: { not: null }, quantiteStock: { not: null } },
    include: { categorie: true, magasin: true },
    orderBy: { designation: "asc" },
  });

  return materiels.filter((materiel) => materiel.quantiteStock! <= materiel.seuilAlerte!);
}

export async function listerDemandesReapprovisionnement() {
  await requireAccesSeuilAlerte();

  return prisma.demandeReapprovisionnement.findMany({
    where: { statut: "EN_ATTENTE_ACHAT" },
    include: { materiel: { include: { magasin: true } } },
    orderBy: { dateCreation: "desc" },
  });
}
