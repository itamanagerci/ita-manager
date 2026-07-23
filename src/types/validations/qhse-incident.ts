import { z } from "zod";
import { chantierRefineur } from "@/types/validations/qhse";

export const reponsePointHSESchema = z.object({
  pointId: z.string().min(1),
  reponse: z.enum(["OUI", "NON"]),
  observation: z.string().optional(),
});

export const creerInspectionHSESchema = z
  .object({
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    projetOuvrageLibre: z.string().optional(),
    lieu: z.string().optional(),
    date: z.string().min(1, "La date est requise"),
    heure: z.string().optional(),
    reponsesPoints: z.array(reponsePointHSESchema).min(1, "Les 26 points doivent être renseignés"),
    commentaires: z.string().optional(),
    relaisQHSEId: z.string().optional(),
    chefChantierId: z.string().optional(),
  })
  .superRefine(chantierRefineur);
export type CreerInspectionHSEInput = z.infer<typeof creerInspectionHSESchema>;

export const seanceSensibilisationSchema = z.object({
  date: z.string().min(1, "La date est requise"),
  theme: z.string().min(1, "Le thème est requis"),
  animateur: z.string().min(1, "L'animateur est requis"),
  commentaire: z.string().optional(),
});

export const creerProgrammeSensibilisationSchema = z
  .object({
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    periodeDu: z.string().min(1, "La période de début est requise"),
    periodeAu: z.string().min(1, "La période de fin est requise"),
    seances: z.array(seanceSensibilisationSchema).min(1, "Au moins une séance est requise"),
  })
  .superRefine(chantierRefineur);
export type CreerProgrammeSensibilisationInput = z.infer<typeof creerProgrammeSensibilisationSchema>;

export const ajouterSeanceSensibilisationSchema = seanceSensibilisationSchema;
export type AjouterSeanceSensibilisationInput = z.infer<typeof ajouterSeanceSensibilisationSchema>;

export const participantPVSchema = z.object({
  numero: z.number().int().positive(),
  nom: z.string().min(1, "Le nom est requis"),
  poste: z.string().optional(),
  aSigne: z.boolean(),
});

export const creerPVSensibilisationSchema = z.object({
  animateur: z.string().min(1, "L'animateur est requis"),
  date: z.string().min(1, "La date est requise"),
  heure: z.string().optional(),
  lieu: z.string().optional(),
  chantierType: z.enum(["CHANTIER", "BUREAUX", "GARAGE", "AUTRE"]),
  lieuAutrePrecision: z.string().optional(),
  sujetsAbordes: z.array(z.string()),
  sujetsAbordesAutrePrecision: z.string().optional(),
  pointsSpecifiquesAbordes: z.string().optional(),
  participants: z.array(participantPVSchema),
  resumeSensibilisation: z.string().optional(),
  observation: z.string().optional(),
});
export type CreerPVSensibilisationInput = z.infer<typeof creerPVSensibilisationSchema>;

export const personneImpliqueeSchema = z.object({
  role: z.enum(["VICTIME", "TEMOIN"]),
  nom: z.string().min(1, "Le nom est requis"),
  fonction: z.string().optional(),
  typePersonne: z.enum(["PERMANENT", "OCCASIONNEL", "COLLATERAL"]).optional(),
});

export const actionImmediateSchema = z.object({
  action: z.string().min(1, "L'action est requise"),
  responsable: z.string().min(1, "Le responsable est requis"),
  clotureLe: z.string().optional(),
});

export const correctionRapportIncidentSchema = z.object({
  correction: z.string().min(1, "La correction est requise"),
  responsable: z.string().min(1, "Le responsable est requis"),
  echeance: z.string().optional(),
  ressourcesNecessaires: z.string().optional(),
  clotureLe: z.string().optional(),
});

export const creerRapportIncidentSchema = z
  .object({
    dateEvenement: z.string().min(1, "La date de l'événement est requise"),
    projetId: z.string().optional(),
    chantierLibre: z.string().optional(),
    lieu: z.string().optional(),
    directionServiceLibre: z.string().optional(),
    typeNotification: z.enum(["ACCIDENT", "INCIDENT", "PRESQU_ACCIDENT"]),

    activite: z.array(z.string()),
    activiteAutrePrecision: z.string().optional(),
    descriptionDommages: z.array(z.string()),
    descriptionDommagesAutrePrecision: z.string().optional(),

    personnesImpliquees: z.array(personneImpliqueeSchema),

    resumeEvenement: z.string().min(1, "Le résumé de l'événement est requis"),

    actionsImmediates: z.array(actionImmediateSchema),

    schemaCorporelPartiesAtteintes: z.array(z.string()),
    typeBlessure: z.array(z.string()),
    descriptionBlessure: z.string().optional(),

    dommagesEnvironnementaux: z.array(z.string()),
    dommagesEnvironnementauxAutrePrecision: z.string().optional(),
    descriptionDommagesEnvironnementaux: z.string().optional(),

    rapportPolice: z.boolean(),
    datePolice: z.string().optional(),
    postePolice: z.string().optional(),
    rapportAssurance: z.boolean(),
    dateAssurance: z.string().optional(),
    referenceAssurance: z.string().optional(),
    rapportExpertise: z.boolean(),
    dateExpertise: z.string().optional(),
    referenceExpertise: z.string().optional(),

    dommagesBiensEquipementsDetails: z.string().optional(),
    fraisMedicauxCoutDommages: z.number().nonnegative().optional(),

    equipeInvestigation: z.array(z.string()),

    causesMatiere: z.array(z.string()),
    causesMethode: z.array(z.string()),
    causesMainOeuvre: z.array(z.string()),
    causesMachine: z.array(z.string()),
    causesMilieu: z.array(z.string()),
    causesDivers: z.array(z.string()),

    analyseCausesMatiere: z.string().optional(),
    analyseCausesMethode: z.string().optional(),
    analyseCausesMainOeuvre: z.string().optional(),
    analyseCausesMachine: z.string().optional(),
    analyseCausesMilieu: z.string().optional(),

    corrections: z.array(correctionRapportIncidentSchema),

    nonConformiteIdentifiee: z.boolean(),
    nonConformiteDescription: z.string().optional(),
  })
  .superRefine(chantierRefineur);
export type CreerRapportIncidentInput = z.infer<typeof creerRapportIncidentSchema>;
