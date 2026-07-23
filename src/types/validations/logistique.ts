import { z } from "zod";

export const creerMaterielSchema = z.object({
  reference: z.string().optional(),
  designation: z.string().min(1, "La désignation est requise"),
  categorieId: z.string().min(1, "La catégorie est requise"),
  uniteMesureId: z.string().min(1, "L'unité de mesure est requise"),
  magasinId: z.string().min(1, "Le magasin est requis"),
  emplacement: z.string().optional(),
  fournisseurHabituel: z.string().optional(),
  quantiteStock: z.number().min(0, "Quantité invalide"),
  seuilAlerte: z.number().min(0, "Seuil invalide").optional(),
  stockSecurite: z.number().min(0, "Stock de sécurité invalide").optional(),
  quantiteReapproStandard: z.number().min(0, "Quantité invalide").optional(),
  delaiFournisseurMoyenJours: z.number().min(0, "Délai invalide").optional(),
});
export type CreerMaterielInput = z.infer<typeof creerMaterielSchema>;

export const modifierMaterielSchema = z.object({
  id: z.string().min(1),
  reference: z.string().optional(),
  designation: z.string().min(1, "La désignation est requise"),
  categorieId: z.string().min(1, "La catégorie est requise"),
  uniteMesureId: z.string().min(1, "L'unité de mesure est requise"),
  magasinId: z.string().min(1, "Le magasin est requis"),
  emplacement: z.string().optional(),
  fournisseurHabituel: z.string().optional(),
  seuilAlerte: z.number().min(0, "Seuil invalide").optional(),
  stockSecurite: z.number().min(0, "Stock de sécurité invalide").optional(),
  quantiteReapproStandard: z.number().min(0, "Quantité invalide").optional(),
  delaiFournisseurMoyenJours: z.number().min(0, "Délai invalide").optional(),
  disponible: z.boolean(),
});
export type ModifierMaterielInput = z.infer<typeof modifierMaterielSchema>;

export const ligneDMSSchema = z.object({
  materielId: z.string().min(1, "L'article est requis"),
  quantiteDemandee: z.number().positive("Quantité invalide"),
});

export const creerDemandeMiseADispositionSchema = z
  .object({
    magasinId: z.string().min(1, "Le magasin est requis"),
    chantierService: z.string().min(1, "Le chantier/service est requis"),
    urgence: z.enum(["NORMAL", "URGENT"]),
    justificationUrgence: z.string().optional(),
    demandeurPoste: z.string().min(1, "Le poste/fonction est requis"),
    demandeurTelephone: z.string().min(1, "Le téléphone est requis"),
    lignes: z.array(ligneDMSSchema).min(1, "Au moins une ligne est requise"),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.urgence === "URGENT" && !donnees.justificationUrgence?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["justificationUrgence"],
        message: "Justification requise pour une demande urgente",
      });
    }
  });
export type CreerDemandeMiseADispositionInput = z.infer<typeof creerDemandeMiseADispositionSchema>;

export const verifierStockDMSSchema = z.object({
  demandeId: z.string().min(1),
  verificationStatut: z.enum(["DISPONIBLE", "RUPTURE_PARTIELLE", "RUPTURE_TOTALE"]),
  verificationObservations: z.string().optional(),
});
export type VerifierStockDMSInput = z.infer<typeof verifierStockDMSSchema>;

export const deciderDMSSchema = z
  .object({
    demandeId: z.string().min(1),
    decision: z.enum(["APPROUVEE", "TRANSFERT_INTER_MAGASIN", "DEMANDE_ACHAT_DECLENCHEE", "REFUSEE"]),
    motifRefus: z.string().optional(),
    magasinCibleId: z.string().optional(),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.decision === "REFUSEE" && !donnees.motifRefus?.trim()) {
      ctx.addIssue({ code: "custom", path: ["motifRefus"], message: "Le motif est requis" });
    }
    if (donnees.decision === "TRANSFERT_INTER_MAGASIN" && !donnees.magasinCibleId) {
      ctx.addIssue({ code: "custom", path: ["magasinCibleId"], message: "Le magasin cible est requis" });
    }
  });
export type DeciderDMSInput = z.infer<typeof deciderDMSSchema>;

export const ligneBEMSchema = z.object({
  materielId: z.string().min(1, "L'article est requis"),
  quantiteRecue: z.number().positive("Quantité invalide"),
});

export const creerBonEntreeMagasinSchema = z.object({
  bonLivraisonFournisseurNumero: z.string().min(1, "Le numéro de bon de livraison est requis"),
  dateReception: z.string().min(1, "La date de réception est requise"),
  magasinId: z.string().min(1, "Le magasin est requis"),
  fournisseur: z.string().min(1, "Le fournisseur est requis"),
  demandeReapprovisionnementId: z.string().optional(),
  // Lot 7 (Achat) : trace optionnelle vers le BC à l'origine de la livraison.
  bonDeCommandeId: z.string().optional(),
  lignes: z.array(ligneBEMSchema).min(1, "Au moins une ligne est requise"),
});
export type CreerBonEntreeMagasinInput = z.infer<typeof creerBonEntreeMagasinSchema>;

export const validerBonEntreeMagasinSchema = z
  .object({
    bemId: z.string().min(1),
    conformite: z.enum(["CONFORME", "NON_CONFORME_AVEC_RESERVES"]),
    reserves: z.string().optional(),
    actionEcart: z
      .enum(["RETOUR_FOURNISSEUR", "AVOIR_A_RECEVOIR", "REGULARISATION_ADMIN", "ACCEPTE_AVEC_RESERVE"])
      .optional(),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.conformite === "NON_CONFORME_AVEC_RESERVES") {
      if (!donnees.reserves?.trim()) {
        ctx.addIssue({ code: "custom", path: ["reserves"], message: "Précisez les réserves" });
      }
      if (!donnees.actionEcart) {
        ctx.addIssue({ code: "custom", path: ["actionEcart"], message: "Action requise" });
      }
    }
  });
export type ValiderBonEntreeMagasinInput = z.infer<typeof validerBonEntreeMagasinSchema>;

export const creerSessionInventaireSchema = z.object({
  type: z.enum(["MENSUEL", "TRIMESTRIEL", "SEMESTRIEL", "ANNUEL", "EXCEPTIONNEL"]),
  magasinId: z.string().min(1, "Le magasin est requis"),
  equipeComptage: z.string().optional(),
});
export type CreerSessionInventaireInput = z.infer<typeof creerSessionInventaireSchema>;

export const enregistrerComptageLigneSchema = z.object({
  sessionId: z.string().min(1),
  materielId: z.string().min(1, "L'article est requis"),
  quantitePhysique: z.number().min(0, "Quantité invalide"),
  commentaire: z.string().optional(),
});
export type EnregistrerComptageLigneInput = z.infer<typeof enregistrerComptageLigneSchema>;
