import { z } from "zod";

const modePaiementEnum = z.enum(["CHEQUE", "VIREMENT", "ESPECES", "MOBILE_MONEY"]);

export const mettreAJourNumeroWaveFournisseurSchema = z.object({
  fournisseurId: z.string().min(1),
  numeroWave: z.string().min(1, "Le numéro Wave est requis"),
});
export type MettreAJourNumeroWaveFournisseurInput = z.infer<
  typeof mettreAJourNumeroWaveFournisseurSchema
>;

export const enregistrerFactureSchema = z.object({
  bonDeCommandeId: z.string().min(1),
  referenceFournisseur: z.string().min(1, "La référence est requise"),
  montant: z.number().positive("Montant invalide"),
  dateFacture: z.string().min(1, "La date de facture est requise"),
});
export type EnregistrerFactureInput = z.infer<typeof enregistrerFactureSchema>;

/// Montant toujours dérivé de Facture.montant côté serveur — jamais
/// ressaisi ni modifiable ici, pour éviter tout écart entre facture
/// enregistrée et paiement exécuté.
export const executerPaiementFactureSchema = z.object({
  factureId: z.string().min(1),
  mode: modePaiementEnum,
  reference: z.string().optional(),
});
export type ExecuterPaiementFactureInput = z.infer<typeof executerPaiementFactureSchema>;

/// Montant toujours dérivé de DemandeMission.fraisDeclares côté serveur —
/// même principe que ci-dessus. Le mode, en revanche, n'a jamais été
/// capturé par la Mission (asymétrie assumée vs. le circuit BC) : DFC le
/// choisit ici.
export const executerPaiementMissionSchema = z.object({
  demandeMissionId: z.string().min(1),
  mode: modePaiementEnum,
  reference: z.string().optional(),
});
export type ExecuterPaiementMissionInput = z.infer<typeof executerPaiementMissionSchema>;

export const demanderCodeAutorisationSchema = z.object({
  justification: z.string().min(1, "La justification est requise"),
});
export type DemanderCodeAutorisationInput = z.infer<typeof demanderCodeAutorisationSchema>;

export const refuserCodeAutorisationSchema = z.object({
  codeId: z.string().min(1),
  motif: z.string().min(1, "Le motif est requis"),
});
export type RefuserCodeAutorisationInput = z.infer<typeof refuserCodeAutorisationSchema>;

export const executerPaiementUrgentSchema = z
  .object({
    codeSaisi: z.string().min(1, "Le code est requis"),
    beneficiaireUtilisateurId: z.string().optional(),
    beneficiaireFournisseurId: z.string().optional(),
    montant: z.number().positive("Montant invalide"),
  })
  .superRefine((donnees, ctx) => {
    const nb = [donnees.beneficiaireUtilisateurId, donnees.beneficiaireFournisseurId].filter(
      (valeur) => !!valeur,
    ).length;
    if (nb !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["beneficiaireUtilisateurId"],
        message: "Sélectionnez exactement un bénéficiaire",
      });
    }
  });
export type ExecuterPaiementUrgentInput = z.infer<typeof executerPaiementUrgentSchema>;
