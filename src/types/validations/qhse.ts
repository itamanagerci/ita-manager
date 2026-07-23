import { z } from "zod";

/// Paire projetId?/chantierLibre? partagée par tous les modèles QHSE, même
/// idiome que DemandeMateriel/DemandeAchat — beaucoup de fiches concernent
/// une base vie/un garage qui n'est jamais devenu un vrai Projet.
export const chantierRefineur = (donnees: { projetId?: string; chantierLibre?: string }, ctx: z.RefinementCtx) => {
  if (!donnees.projetId && !donnees.chantierLibre?.trim()) {
    ctx.addIssue({ code: "custom", path: ["chantierLibre"], message: "Indiquez un chantier ou un projet" });
  }
};

export const completerAccueilSecuriteSchema = z.object({
  age: z.number().int().positive().optional(),
  statutTravailleur: z.enum(["PERMANENT", "OCCASIONNEL", "VISITEUR"]).optional(),
  contactsTelephone: z.string().optional(),
  lieuHabitation: z.string().optional(),
  personneContactUrgenceNom: z.string().optional(),
  personneContactUrgenceTelephone: z.string().optional(),
  epiRecus: z.array(z.string()),
  autresEquipements: z.string().optional(),
  informationsFormationsRecues: z.array(z.string()),
  sensibilisationsConduites: z.array(z.string()),
});
export type CompleterAccueilSecuriteInput = z.infer<typeof completerAccueilSecuriteSchema>;

export const tacheASTSchema = z.object({
  ressources: z.string().min(1, "Les ressources sont requises"),
  risques: z.string().min(1, "Les risques sont requis"),
  mesuresPrevention: z.string().min(1, "Les mesures de prévention sont requises"),
});

export const creerASTSchema = z
  .object({
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    taches: z.array(tacheASTSchema).min(1, "Au moins une tâche est requise"),
  })
  .superRefine(chantierRefineur);
export type CreerASTInput = z.infer<typeof creerASTSchema>;

export const validerASTSchema = z.object({
  astId: z.string().min(1),
  decision: z.enum(["VALIDEE", "REFUSEE"]),
  motifRefus: z.string().optional(),
});
export type ValiderASTInput = z.infer<typeof validerASTSchema>;

export const creerAttributionEPISchema = z
  .object({
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    lieu: z.string().optional(),
    beneficiaireId: z.string().min(1, "Le bénéficiaire est requis"),
    materielId: z.string().min(1, "L'article est requis"),
    quantiteSortie: z.number().positive("Quantité invalide"),
    retourEpiUsage: z.boolean(),
  })
  .superRefine(chantierRefineur);
export type CreerAttributionEPIInput = z.infer<typeof creerAttributionEPISchema>;

export const creerRapportHebdoQHSESchema = z
  .object({
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    semaineDu: z.string().min(1, "La date de début est requise"),
    semaineAu: z.string().min(1, "La date de fin est requise"),
    effectifVendredi: z.number().int().min(0),
    effectifSamedi: z.number().int().min(0),
    effectifLundi: z.number().int().min(0),
    effectifMardi: z.number().int().min(0),
    effectifMercredi: z.number().int().min(0),
    effectifJeudi: z.number().int().min(0),
    activitesQHSE: z.string().min(1, "Les activités QHSE sont requises"),
    constatsEffectues: z.string().min(1, "Les constats sont requis"),
    propositionsRecommandations: z.string().min(1, "Les propositions sont requises"),
  })
  .superRefine(chantierRefineur);
export type CreerRapportHebdoQHSEInput = z.infer<typeof creerRapportHebdoQHSESchema>;

export const creerNonConformiteManuelleSchema = z.object({
  typeNonConformite: z.enum([
    "RECLAMATION",
    "NON_RESPECT_EXIGENCE",
    "AUDIT_EXTERNE",
    "INSPECTION_VISUELLE",
    "CONTROLE_QUALITE",
    "INDICATEUR_NON_ATTEINT",
  ]),
  processus: z.string().optional(),
  normeDocReference: z.string().optional(),
  refExigence: z.string().optional(),
  descriptionNonConformite: z.string().min(1, "La description est requise"),
  preuveDescription: z.string().optional(),
});
export type CreerNonConformiteManuelleInput = z.infer<typeof creerNonConformiteManuelleSchema>;

export const mettreAJourPlanActionNonConformiteSchema = z.object({
  nonConformiteId: z.string().min(1),
  correctionContenu: z.string().optional(),
  correctionDelai: z.string().optional(),
  analyseCausesContenu: z.string().optional(),
  analyseCausesDelai: z.string().optional(),
  actionsCorrectivesContenu: z.string().optional(),
  actionsCorrectivesDelai: z.string().optional(),
  dateAchevement: z.string().optional(),
  responsableMiseOeuvreId: z.string().optional(),
});
export type MettreAJourPlanActionNonConformiteInput = z.infer<
  typeof mettreAJourPlanActionNonConformiteSchema
>;

export const cloturerNonConformiteSchema = z.object({
  nonConformiteId: z.string().min(1),
  decisionCloture: z.enum(["ACCEPTEE", "REFUSEE", "A_CONFIRMER_PROCHAINE_VERIFICATION"]),
});
export type CloturerNonConformiteInput = z.infer<typeof cloturerNonConformiteSchema>;
