import { z } from "zod";

export const ligneDemandeAchatSchema = z
  .object({
    articleId: z.string().optional(),
    designationLibre: z.string().optional(),
    quantite: z.number().positive("Quantité invalide"),
  })
  .superRefine((donnees, ctx) => {
    if (!donnees.articleId && !donnees.designationLibre?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["designationLibre"],
        message: "Sélectionnez un article du bordereau ou saisissez une désignation",
      });
    }
  });

export const creerDemandeAchatSchema = z
  .object({
    forType: z.enum(["SERVICE", "CHANTIER"]),
    forServiceModuleCode: z.string().optional(),
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    lieuLivraisonProjetId: z.string().optional(),
    lieuLivraisonLibre: z.string().optional(),
    dateLivraisonSouhaitee: z.string().min(1, "La date de livraison souhaitée est requise"),
    justification: z.string().min(1, "La justification est requise"),
    // Optionnels : permettent de soumettre pour un autre demandeur (même
    // précédent que DemandeMission.employeConcerneId/initiateurId) — par
    // défaut, demandeur = émetteur = créateur = l'utilisateur courant.
    demandeurId: z.string().optional(),
    emetteurId: z.string().optional(),
    lignes: z.array(ligneDemandeAchatSchema).min(1, "Au moins une ligne est requise"),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.forType === "SERVICE" && !donnees.forServiceModuleCode) {
      ctx.addIssue({
        code: "custom",
        path: ["forServiceModuleCode"],
        message: "Le service est requis",
      });
    }
    if (donnees.forType === "CHANTIER" && !donnees.projetId && !donnees.chantierLibre?.trim()) {
      ctx.addIssue({ code: "custom", path: ["chantierLibre"], message: "Indiquez un chantier" });
    }
    if (!donnees.lieuLivraisonProjetId && !donnees.lieuLivraisonLibre?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["lieuLivraisonLibre"],
        message: "Indiquez un lieu de livraison",
      });
    }
  });
export type CreerDemandeAchatInput = z.infer<typeof creerDemandeAchatSchema>;

export const refuserDemandeAchatSchema = z.object({
  demandeId: z.string().min(1),
  motif: z.string().min(1, "Le motif est requis"),
});
export type RefuserDemandeAchatInput = z.infer<typeof refuserDemandeAchatSchema>;

export const ligneTraitementAchatSchema = z
  .object({
    ligneId: z.string().min(1),
    fournisseur: z.string().min(1, "Le fournisseur est requis"),
    modeTarification: z.enum(["FORFAITAIRE", "CALCULE"]),
    prixUnitaire: z.number().positive().optional(),
    montantForfaitaire: z.number().positive().optional(),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.modeTarification === "CALCULE" && !donnees.prixUnitaire) {
      ctx.addIssue({
        code: "custom",
        path: ["prixUnitaire"],
        message: "Le prix unitaire est requis en mode calculé",
      });
    }
    if (donnees.modeTarification === "FORFAITAIRE" && !donnees.montantForfaitaire) {
      ctx.addIssue({
        code: "custom",
        path: ["montantForfaitaire"],
        message: "Le montant forfaitaire est requis en mode forfaitaire",
      });
    }
  });

export const traiterDemandeAchatSchema = z
  .object({
    demandeId: z.string().min(1),
    lignes: z.array(ligneTraitementAchatSchema).min(1),
    dateLivraisonPrevue: z.string().min(1, "La date de livraison prévue est requise"),
    tauxTva: z.number().min(0, "Taux invalide"),
    typePaiement: z.enum(["CHEQUE", "VIREMENT", "ESPECES", "MOBILE_MONEY"]),
    echeancePaiementJours: z.union([z.literal(30), z.literal(60)]),
    urgent: z.boolean(),
    rolesSelectionnes: z.array(z.enum(["DT", "RH", "DFC", "DG"])).optional(),
  })
  .superRefine((donnees, ctx) => {
    if (!donnees.urgent && (!donnees.rolesSelectionnes || donnees.rolesSelectionnes.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["rolesSelectionnes"],
        message: "Sélectionnez au moins un validateur pour une demande standard",
      });
    }
  });
export type TraiterDemandeAchatInput = z.infer<typeof traiterDemandeAchatSchema>;

export const refuserParalleleSchema = z.object({
  validationId: z.string().min(1),
  motif: z.string().min(1, "Le motif est requis"),
});
export type RefuserParalleleInput = z.infer<typeof refuserParalleleSchema>;

export const mettreAJourArticleFournisseurPrixSchema = z.object({
  articleId: z.string().min(1),
  fournisseur: z.string().min(1, "Le fournisseur est requis"),
  prix: z.number().positive("Prix invalide"),
});
export type MettreAJourArticleFournisseurPrixInput = z.infer<
  typeof mettreAJourArticleFournisseurPrixSchema
>;

export const mettreAJourSeuilUrgenceSchema = z.object({
  seuilUrgence: z.number().positive("Seuil invalide"),
});
export type MettreAJourSeuilUrgenceInput = z.infer<typeof mettreAJourSeuilUrgenceSchema>;
