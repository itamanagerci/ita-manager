"use server";

import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { prisma } from "@/lib/prisma";

async function requireAccesSuiviDemandes() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "achat", "suivi-demandes");
  return utilisateur;
}

/**
 * Assemble les 7 étapes du circuit pour la mini-timeline en lecture seule :
 * soumis → validation département → traitement Achat → validation
 * parallèle → BC émis → réception Logistique (via LigneBonDeCommande →
 * BonDeCommande → BonEntreeMagasin.bonDeCommandeId) → facturation DFC
 * (placeholder, Lot 8 pas construit). Une demande peut faire émettre
 * plusieurs BC (un par fournisseur représenté dans ses lignes) — d'où la
 * liste bonsDeCommande plutôt qu'un singleton. Cf. CLAUDE.md.
 */
export async function listerSuiviDemandesAchat() {
  await requireAccesSuiviDemandes();

  return prisma.demandeAchat.findMany({
    include: {
      demandeur: { select: { nom: true, prenom: true } },
      directeurDepartement: { select: { nom: true, prenom: true } },
      traitePar: { select: { nom: true, prenom: true } },
      validations: { include: { validePar: { select: { nom: true, prenom: true } } } },
      lignes: {
        include: {
          article: { select: { designation: true } },
          ligneBC: {
            include: {
              bonDeCommande: {
                include: { bonsEntreeMagasin: true },
              },
            },
          },
        },
      },
    },
    orderBy: { dateCreation: "desc" },
  });
}

export type SuiviDemandeAchat = Awaited<ReturnType<typeof listerSuiviDemandesAchat>>[number];
