import { z } from "zod";

const typeProfilEnum = z.enum(["AGENT", "SOUS_TRAITANT", "OUVRIER"]);

export const profilRHSchema = z
  .object({
    typeProfil: typeProfilEnum,
    poste: z.string().min(1, "Le poste est requis"),
    service: z.string().min(1, "Le service est requis"),
    dateEntree: z.string().min(1, "La date d'entrée est requise"),
    soldeConges: z.number().int().min(0, "Le solde ne peut pas être négatif"),
    superieurId: z.string().optional(),
    salaireFixe: z.number().positive().optional(),
    entrepriseRattachee: z.string().optional(),
    tauxJournalier: z.number().positive().optional(),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.typeProfil === "AGENT" && !donnees.salaireFixe) {
      ctx.addIssue({
        code: "custom",
        path: ["salaireFixe"],
        message: "Le salaire fixe est requis pour un agent",
      });
    }
    if (donnees.typeProfil === "SOUS_TRAITANT" && !donnees.entrepriseRattachee) {
      ctx.addIssue({
        code: "custom",
        path: ["entrepriseRattachee"],
        message: "L'entreprise rattachée est requise pour un sous-traitant",
      });
    }
    if (donnees.typeProfil === "OUVRIER" && !donnees.tauxJournalier) {
      ctx.addIssue({
        code: "custom",
        path: ["tauxJournalier"],
        message: "Le taux journalier est requis pour un ouvrier",
      });
    }
  });

export type ProfilRHInput = z.infer<typeof profilRHSchema>;

const typeAbsenceEnum = z.enum(["CONGE", "PERMISSION"]);

export const creerDemandeAbsenceSchema = z
  .object({
    type: typeAbsenceEnum,
    dateDebut: z.string().min(1, "La date de début est requise"),
    dateFin: z.string().optional(),
    dureeHeures: z.number().int().positive().optional(),
    motif: z.string().min(1, "Le motif est requis"),
  })
  .superRefine((donnees, ctx) => {
    if (donnees.type === "CONGE" && !donnees.dateFin) {
      ctx.addIssue({ code: "custom", path: ["dateFin"], message: "La date de fin est requise" });
    }
    if (donnees.type === "PERMISSION" && !donnees.dureeHeures) {
      ctx.addIssue({
        code: "custom",
        path: ["dureeHeures"],
        message: "La durée (en heures) est requise",
      });
    }
  });

export type CreerDemandeAbsenceInput = z.infer<typeof creerDemandeAbsenceSchema>;

export const creerDemandeMissionSchema = z.object({
  employeConcerneId: z.string().min(1, "L'employé concerné est requis"),
  typeMission: z.enum(["CHANTIER", "FORMATION", "REPRESENTATION_CLIENT", "AUTRE"]),
  description: z.string().min(1, "La description est requise"),
  lieu: z.string().min(1, "Le lieu est requis"),
  dateDebut: z.string().min(1, "La date de début est requise"),
  dateFin: z.string().min(1, "La date de fin est requise"),
  fraisDeclares: z.number().nonnegative().optional(),
  motifFrais: z.string().optional(),
});

export type CreerDemandeMissionInput = z.infer<typeof creerDemandeMissionSchema>;

export const creerReleveActiviteSchema = z.object({
  ouvrierId: z.string().min(1, "L'ouvrier est requis"),
  projetLibelle: z.string().min(1, "Le projet est requis"),
  periode: z.string().min(1, "La période est requise"),
  joursTravailles: z.number().int().positive("Nombre de jours invalide"),
});

export type CreerReleveActiviteInput = z.infer<typeof creerReleveActiviteSchema>;

export const refuserSchema = z.object({
  demandeId: z.string().min(1),
  motif: z.string().min(1, "Le motif est requis"),
});

export type RefuserInput = z.infer<typeof refuserSchema>;
