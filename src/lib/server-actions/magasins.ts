"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";

/**
 * Page intentionnellement légère : fiche-inventaire est déjà le
 * sous-module propriétaire du CRUD Materiel, magasins ne joue que le rôle
 * d'ancre d'accès (comme carburant/depots) — pas un second entrepôt de
 * données. Cf. CLAUDE.md.
 */
export async function obtenirResumeMagasins() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "magasins");

  const magasins = await prisma.magasin.findMany({
    include: { responsable: { select: { nom: true, prenom: true } } },
    orderBy: { code: "asc" },
  });

  return Promise.all(
    magasins.map(async (magasin) => {
      const [articlesSuivis, materielsAvecSeuil, dmsEnAttente, bemEnAttente] = await Promise.all([
        prisma.materiel.count({ where: { magasinId: magasin.id, quantiteStock: { not: null } } }),
        prisma.materiel.findMany({
          where: { magasinId: magasin.id, quantiteStock: { not: null }, seuilAlerte: { not: null } },
          select: { quantiteStock: true, seuilAlerte: true },
        }),
        prisma.demandeMiseADisposition.count({
          where: {
            magasinId: magasin.id,
            statut: { in: ["EN_ATTENTE_VERIFICATION", "EN_ATTENTE_DECISION"] },
          },
        }),
        prisma.bonEntreeMagasin.count({
          where: { magasinId: magasin.id, statut: "EN_ATTENTE_VALIDATION" },
        }),
      ]);

      return {
        magasin,
        articlesSuivis,
        alertesActives: materielsAvecSeuil.filter((m) => m.quantiteStock! <= m.seuilAlerte!).length,
        dmsEnAttente,
        bemEnAttente,
      };
    }),
  );
}
