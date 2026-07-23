"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";

/**
 * Vue de reporting pure (6.9) — aucune écriture, alimentée par
 * Gestion Carburant (Lot 3) et le kilométrage véhicule. Kilométrage
 * parcouru = écart min/max de DemandeCarburant.kilometrageCompteur sur la
 * période (aucun autre historique de compteur n'existe pour ce calcul).
 */
export async function obtenirConsommationParVehicule(dateDebut: Date, dateFin: Date) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "suivi-conso-carburant");

  const vehicules = await prisma.vehicule.findMany({
    where: { type: { in: ["LEGER", "LOURD"] } },
    orderBy: { immatriculation: "asc" },
  });

  const resultats = await Promise.all(
    vehicules.map(async (vehicule) => {
      const demandes = await prisma.demandeCarburant.findMany({
        where: {
          vehiculeId: vehicule.id,
          statut: "VALIDEE",
          dateCreation: { gte: dateDebut, lte: dateFin },
        },
        select: { quantiteDemandeeLitres: true, kilometrageCompteur: true },
      });

      const quantiteConsommee = demandes.reduce((total, d) => total + d.quantiteDemandeeLitres, 0);
      const kilometrages = demandes.map((d) => d.kilometrageCompteur);
      const kilometrageParcouru =
        kilometrages.length >= 2 ? Math.max(...kilometrages) - Math.min(...kilometrages) : 0;
      const ratio = kilometrageParcouru > 0 ? (quantiteConsommee / kilometrageParcouru) * 100 : null;

      return { vehicule, quantiteConsommee, kilometrageParcouru, ratio };
    }),
  );

  return resultats;
}
