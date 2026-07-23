"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";

async function requireAccesTableauxSuivi() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "tableaux-suivi");
  return utilisateur;
}

/**
 * Synthèse mensuelle par magasin (6.13) — explicitement différée de la
 * Livraison A (TSG-INV lui-même vit sur fiche-inventaire). Aucune nouvelle
 * table : agrégation pure sur MouvementStock/DemandeReapprovisionnement/
 * SessionInventaire.
 */
export async function obtenirSyntheseMensuelleParMagasin(dateDebut: Date, dateFin: Date) {
  await requireAccesTableauxSuivi();

  const magasins = await prisma.magasin.findMany({ orderBy: { code: "asc" } });

  return Promise.all(
    magasins.map(async (magasin) => {
      const [articlesEnStock, entrees, sorties, alertesActives, demandesEnCours, dernierInventaire] =
        await Promise.all([
          prisma.materiel.count({ where: { magasinId: magasin.id, quantiteStock: { not: null } } }),
          prisma.mouvementStock.count({
            where: {
              type: "ENTREE",
              date: { gte: dateDebut, lte: dateFin },
              materiel: { magasinId: magasin.id },
            },
          }),
          prisma.mouvementStock.count({
            where: {
              type: "SORTIE",
              date: { gte: dateDebut, lte: dateFin },
              materiel: { magasinId: magasin.id },
            },
          }),
          prisma.materiel
            .findMany({
              where: { magasinId: magasin.id, quantiteStock: { not: null }, seuilAlerte: { not: null } },
              select: { quantiteStock: true, seuilAlerte: true },
            })
            .then((materiels) => materiels.filter((m) => m.quantiteStock! <= m.seuilAlerte!).length),
          prisma.demandeReapprovisionnement.count({
            where: { statut: "EN_ATTENTE_ACHAT", materiel: { magasinId: magasin.id } },
          }),
          prisma.sessionInventaire.findFirst({
            where: { magasinId: magasin.id, statut: "CLOTUREE" },
            orderBy: { dateValidation: "desc" },
            select: { dateValidation: true },
          }),
        ]);

      return {
        magasin,
        articlesEnStock,
        entrees,
        sorties,
        alertesActives,
        demandesEnCours,
        dateDernierInventaire: dernierInventaire?.dateValidation ?? null,
      };
    }),
  );
}

/** Synthèse — pas la grille journalière des fichiers Excel "Suivi Disponibilité". */
export async function obtenirDisponibiliteVehicules() {
  await requireAccesTableauxSuivi();

  const types = ["LEGER", "LOURD", "ENGIN"] as const;

  return Promise.all(
    types.map(async (type) => {
      const [enService, indisponibles] = await Promise.all([
        prisma.vehicule.count({ where: { type, etat: "OK", dateSortieDefinitive: null } }),
        prisma.vehicule.count({
          where: { type, etat: { in: ["PANNE", "HORS_SERVICE"] }, dateSortieDefinitive: null },
        }),
      ]);
      const total = enService + indisponibles;

      return {
        type,
        enService,
        indisponibles,
        total,
        tauxDisponibilite: total > 0 ? enService / total : null,
      };
    }),
  );
}
