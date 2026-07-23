"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerRapportIncident } from "@/lib/server-actions/qhse-rapport-incident";
import {
  creerRapportIncidentSchema,
  type CreerRapportIncidentInput,
} from "@/types/validations/qhse-incident";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import { CheckboxListe } from "@/components/qhse/checkbox-liste";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ACTIVITES = [
  "Manutention", "Fouille", "Circulation sur le chantier", "Pose de conduite",
  "Chargement / Déchargement", "Travail en hauteur", "Génie civil", "Courses administratives",
  "Conduite", "Matières dangereuses", "Transport", "Assainissement",
  "Adduction en Eau Potable", "Routes et voiries", "Entreposage", "Mécanique",
  "Électrique", "Curage", "Missions",
];
const DOMMAGES = [
  "Feu / Explosion", "Dommages à l'environnement", "Dommages à un tiers",
  "Destruction d'équipement/engin", "Accident de la route", "Accident avec arrêt de travail",
  "Accident sans arrêt de travail", "Premier soin", "Dommages / Perte de matériels",
  "Décès", "Invalidité partielle/permanente",
];
const ANATOMIE = [
  "Crâne", "Orbite", "Mandibule", "Rachis cervical", "Clavicule", "Sternum", "Humérus",
  "Rachis dorsal", "Cartilages costaux", "Rachis lombaire", "Os coxal", "Radius", "Ulna",
  "Carpe", "Métacarpe", "Phalanges", "Fémur", "Rotule", "Tibia", "Fibula", "Tarse",
  "Métatarse", "Calcanéum", "Orteils", "Ischion", "Coccyx", "Sacrum",
];
const TYPES_BLESSURE = [
  "Écharde / Piqûre", "Coupure", "Abrasion", "Hématome", "Écrasement", "Pincement",
  "Fracture", "Amputation", "Coma", "Infection", "Brûlure",
];
const DOMMAGES_ENV = [
  "Pollution de l'air", "Pollution de l'eau", "Pollution du sol",
  "Déversement de produit chimique", "Poussière", "Apparition de trous ou crevasses",
  "Bruit", "Déchets",
];
const CAUSES_MATIERE = ["Matière non-conforme", "Matières dangereuses (EPI...)", "Surcharge", "Autre"];
const CAUSES_METHODE = [
  "Absence de procédure", "Non-respect d'une règle", "Absence d'EPI",
  "Procédure incomplète", "Procédure inadaptée au travail", "Autre",
];
const CAUSES_MAIN_OEUVRE = [
  "Formation", "Expérience", "Comportement", "Employé physiquement inapte", "Fatigue",
  "Problèmes personnels", "Stress / Pression", "Drogues / Alcool", "Analphabétisme",
  "Gestes et postures", "Non-respect d'une règle (code route...)", "Autre",
];
const CAUSES_MACHINE = [
  "Équipement inadapté", "Équipement défectueux", "Mauvaise conception (équipement, atelier)",
  "Contrôles mal réalisés (inspections)", "Opérations simultanées", "Incompatibilité d'opérations",
  "non-Conformité réglementaire", "Machines mouvantes", "Autre",
];
const CAUSES_MILIEU = [
  "Éclairage", "Température", "Ventilation", "Humidité / Temps sec", "Nettoyage",
  "Surface du sol", "Espace confiné", "Visibilité", "Niveaux de bruit", "Tiers",
  "Conduite de nuit", "Autre",
];
const CAUSES_DIVERS = [
  "Réponse d'urgence", "Management / Supervision", "Directives / Communication",
  "Sensibilisation", "Compétences", "Autre",
];

interface RapportIncidentFormProps {
  projets: { id: string; nom: string }[];
}

export function RapportIncidentForm({ projets }: RapportIncidentFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [equipeInvestigationTexte, setEquipeInvestigationTexte] = useState("");

  const [activite, setActivite] = useState<string[]>([]);
  const [descriptionDommages, setDescriptionDommages] = useState<string[]>([]);
  const [schemaCorporel, setSchemaCorporel] = useState<string[]>([]);
  const [typeBlessure, setTypeBlessure] = useState<string[]>([]);
  const [dommagesEnvironnementaux, setDommagesEnvironnementaux] = useState<string[]>([]);
  const [causesMatiere, setCausesMatiere] = useState<string[]>([]);
  const [causesMethode, setCausesMethode] = useState<string[]>([]);
  const [causesMainOeuvre, setCausesMainOeuvre] = useState<string[]>([]);
  const [causesMachine, setCausesMachine] = useState<string[]>([]);
  const [causesMilieu, setCausesMilieu] = useState<string[]>([]);
  const [causesDivers, setCausesDivers] = useState<string[]>([]);

  const defaultValues: CreerRapportIncidentInput = {
    dateEvenement: "",
    projetId: projets[0]?.id ?? "",
    typeNotification: "INCIDENT",
    resumeEvenement: "",
    rapportPolice: false,
    rapportAssurance: false,
    rapportExpertise: false,
    nonConformiteIdentifiee: false,
    activite: [],
    descriptionDommages: [],
    personnesImpliquees: [],
    actionsImmediates: [],
    schemaCorporelPartiesAtteintes: [],
    typeBlessure: [],
    dommagesEnvironnementaux: [],
    equipeInvestigation: [],
    causesMatiere: [],
    causesMethode: [],
    causesMainOeuvre: [],
    causesMachine: [],
    causesMilieu: [],
    causesDivers: [],
    corrections: [],
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreerRapportIncidentInput>({
    resolver: zodResolver(creerRapportIncidentSchema),
    defaultValues,
  });

  const personnesImpliquees = useFieldArray({ control, name: "personnesImpliquees" });
  const actionsImmediates = useFieldArray({ control, name: "actionsImmediates" });
  const corrections = useFieldArray({ control, name: "corrections" });

  const nonConformiteIdentifiee = watch("nonConformiteIdentifiee");

  async function onSubmit(values: CreerRapportIncidentInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerRapportIncident({
      ...values,
      activite,
      descriptionDommages,
      schemaCorporelPartiesAtteintes: schemaCorporel,
      typeBlessure,
      dommagesEnvironnementaux,
      causesMatiere,
      causesMethode,
      causesMainOeuvre,
      causesMachine,
      causesMilieu,
      causesDivers,
      equipeInvestigation: equipeInvestigationTexte
        .split("\n")
        .map((nom) => nom.trim())
        .filter(Boolean),
    });

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes(
      "Rapport enregistré",
      values.nonConformiteIdentifiee ? "Une Non-Conformité a été créée." : undefined,
    );
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau rapport</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Rapport d&apos;Incident / Accident / Presqu&apos;accident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date de l'événement" htmlFor="dateEvenement" error={errors.dateEvenement?.message}>
              <Input id="dateEvenement" type="date" {...register("dateEvenement")} />
            </FormField>
            <FormField label="Type" htmlFor="typeNotification">
              <NativeSelect id="typeNotification" {...register("typeNotification")}>
                <option value="ACCIDENT">Accident</option>
                <option value="INCIDENT">Incident</option>
                <option value="PRESQU_ACCIDENT">Presqu&apos;accident</option>
              </NativeSelect>
            </FormField>
            <FormField label="Chantier" htmlFor="projetId">
              <NativeSelect id="projetId" {...register("projetId")}>
                <option value="">Aucun</option>
                {projets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Chantier (texte libre)" htmlFor="chantierLibre" error={errors.chantierLibre?.message}>
              <Input id="chantierLibre" {...register("chantierLibre")} />
            </FormField>
            <FormField label="Lieu" htmlFor="lieu">
              <Input id="lieu" {...register("lieu")} />
            </FormField>
            <FormField label="Direction / Service" htmlFor="directionServiceLibre">
              <Input id="directionServiceLibre" {...register("directionServiceLibre")} />
            </FormField>
          </div>

          <Separator />
          <CheckboxListe label="A.1 — Activité" options={ACTIVITES} values={activite} onChange={setActivite} />
          <CheckboxListe
            label="A.2 — Description des dommages"
            options={DOMMAGES}
            values={descriptionDommages}
            onChange={setDescriptionDommages}
          />

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Victimes et témoins
          </p>
          {personnesImpliquees.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-4 gap-3 rounded-md border border-border p-3">
              <FormField label="Rôle" htmlFor={`personnesImpliquees.${index}.role`}>
                <NativeSelect id={`personnesImpliquees.${index}.role`} {...register(`personnesImpliquees.${index}.role`)}>
                  <option value="VICTIME">Victime</option>
                  <option value="TEMOIN">Témoin</option>
                </NativeSelect>
              </FormField>
              <FormField label="Nom" htmlFor={`personnesImpliquees.${index}.nom`}>
                <Input id={`personnesImpliquees.${index}.nom`} {...register(`personnesImpliquees.${index}.nom`)} />
              </FormField>
              <FormField label="Fonction" htmlFor={`personnesImpliquees.${index}.fonction`}>
                <Input id={`personnesImpliquees.${index}.fonction`} {...register(`personnesImpliquees.${index}.fonction`)} />
              </FormField>
              <FormField label="Type (victime)" htmlFor={`personnesImpliquees.${index}.typePersonne`}>
                <NativeSelect id={`personnesImpliquees.${index}.typePersonne`} {...register(`personnesImpliquees.${index}.typePersonne`)}>
                  <option value="">—</option>
                  <option value="PERMANENT">Permanent</option>
                  <option value="OCCASIONNEL">Occasionnel</option>
                  <option value="COLLATERAL">Collatéral</option>
                </NativeSelect>
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-span-4 self-start"
                onClick={() => personnesImpliquees.remove(index)}
              >
                Retirer
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => personnesImpliquees.append({ role: "VICTIME", nom: "" })}
          >
            Ajouter une personne
          </Button>

          <Separator />
          <FormField label="A.3 — Résumé de l'événement (faits)" htmlFor="resumeEvenement" error={errors.resumeEvenement?.message}>
            <Input id="resumeEvenement" {...register("resumeEvenement")} />
          </FormField>

          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Actions immédiates</p>
          {actionsImmediates.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
              <FormField label="Action" htmlFor={`actionsImmediates.${index}.action`}>
                <Input id={`actionsImmediates.${index}.action`} {...register(`actionsImmediates.${index}.action`)} />
              </FormField>
              <FormField label="Responsable" htmlFor={`actionsImmediates.${index}.responsable`}>
                <Input id={`actionsImmediates.${index}.responsable`} {...register(`actionsImmediates.${index}.responsable`)} />
              </FormField>
              <FormField label="Clôturé le" htmlFor={`actionsImmediates.${index}.clotureLe`}>
                <Input id={`actionsImmediates.${index}.clotureLe`} type="date" {...register(`actionsImmediates.${index}.clotureLe`)} />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-span-3 self-start"
                onClick={() => actionsImmediates.remove(index)}
              >
                Retirer
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => actionsImmediates.append({ action: "", responsable: "" })}
          >
            Ajouter une action immédiate
          </Button>

          <Separator />
          <CheckboxListe label="Schéma corporel — parties atteintes" options={ANATOMIE} values={schemaCorporel} onChange={setSchemaCorporel} />
          <CheckboxListe label="Type de blessure" options={TYPES_BLESSURE} values={typeBlessure} onChange={setTypeBlessure} />
          <FormField label="Description de la blessure" htmlFor="descriptionBlessure">
            <Input id="descriptionBlessure" {...register("descriptionBlessure")} />
          </FormField>

          <CheckboxListe
            label="Dommages environnementaux"
            options={DOMMAGES_ENV}
            values={dommagesEnvironnementaux}
            onChange={setDommagesEnvironnementaux}
          />
          <FormField label="Description dommages environnementaux" htmlFor="descriptionDommagesEnvironnementaux">
            <Input id="descriptionDommagesEnvironnementaux" {...register("descriptionDommagesEnvironnementaux")} />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-input" {...register("rapportPolice")} />
              Rapport de police
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-input" {...register("rapportAssurance")} />
              Rapport d&apos;assurance
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-input" {...register("rapportExpertise")} />
              Rapport d&apos;expertise
            </label>
          </div>

          <FormField label="Détails dommages biens/équipements" htmlFor="dommagesBiensEquipementsDetails">
            <Input id="dommagesBiensEquipementsDetails" {...register("dommagesBiensEquipementsDetails")} />
          </FormField>
          <FormField label="Coût des dommages / frais médicaux" htmlFor="fraisMedicauxCoutDommages">
            <Input id="fraisMedicauxCoutDommages" type="number" min={0} {...register("fraisMedicauxCoutDommages", { valueAsNumber: true })} />
          </FormField>

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            B.1 — Équipe d&apos;investigation (un nom par ligne)
          </p>
          <textarea
            className="min-h-20 rounded-md border border-input bg-transparent p-2 text-sm"
            value={equipeInvestigationTexte}
            onChange={(e) => setEquipeInvestigationTexte(e.target.value)}
          />

          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            B.2 — Causes identifiées
          </p>
          <CheckboxListe label="Matière" options={CAUSES_MATIERE} values={causesMatiere} onChange={setCausesMatiere} />
          <CheckboxListe label="Méthode" options={CAUSES_METHODE} values={causesMethode} onChange={setCausesMethode} />
          <CheckboxListe label="Main d'œuvre" options={CAUSES_MAIN_OEUVRE} values={causesMainOeuvre} onChange={setCausesMainOeuvre} />
          <CheckboxListe label="Machine" options={CAUSES_MACHINE} values={causesMachine} onChange={setCausesMachine} />
          <CheckboxListe label="Milieu" options={CAUSES_MILIEU} values={causesMilieu} onChange={setCausesMilieu} />
          <CheckboxListe label="Divers" options={CAUSES_DIVERS} values={causesDivers} onChange={setCausesDivers} />

          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            B.3 — Analyse des causes racines (5M)
          </p>
          <div className="grid grid-cols-1 gap-3">
            <FormField label="Matière" htmlFor="analyseCausesMatiere">
              <Input id="analyseCausesMatiere" {...register("analyseCausesMatiere")} />
            </FormField>
            <FormField label="Méthode" htmlFor="analyseCausesMethode">
              <Input id="analyseCausesMethode" {...register("analyseCausesMethode")} />
            </FormField>
            <FormField label="Main d'œuvre" htmlFor="analyseCausesMainOeuvre">
              <Input id="analyseCausesMainOeuvre" {...register("analyseCausesMainOeuvre")} />
            </FormField>
            <FormField label="Machine" htmlFor="analyseCausesMachine">
              <Input id="analyseCausesMachine" {...register("analyseCausesMachine")} />
            </FormField>
            <FormField label="Milieu" htmlFor="analyseCausesMilieu">
              <Input id="analyseCausesMilieu" {...register("analyseCausesMilieu")} />
            </FormField>
          </div>

          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">B.4 — Correction</p>
          {corrections.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-4 gap-3 rounded-md border border-border p-3">
              <FormField label="Correction" htmlFor={`corrections.${index}.correction`}>
                <Input id={`corrections.${index}.correction`} {...register(`corrections.${index}.correction`)} />
              </FormField>
              <FormField label="Responsable" htmlFor={`corrections.${index}.responsable`}>
                <Input id={`corrections.${index}.responsable`} {...register(`corrections.${index}.responsable`)} />
              </FormField>
              <FormField label="Échéance" htmlFor={`corrections.${index}.echeance`}>
                <Input id={`corrections.${index}.echeance`} type="date" {...register(`corrections.${index}.echeance`)} />
              </FormField>
              <FormField label="Ressources nécessaires" htmlFor={`corrections.${index}.ressourcesNecessaires`}>
                <Input id={`corrections.${index}.ressourcesNecessaires`} {...register(`corrections.${index}.ressourcesNecessaires`)} />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-span-4 self-start"
                onClick={() => corrections.remove(index)}
              >
                Retirer
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => corrections.append({ correction: "", responsable: "" })}
          >
            Ajouter une correction
          </Button>

          <Separator />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 rounded border-input" {...register("nonConformiteIdentifiee")} />
            Une non-conformité a été identifiée dans ce rapport
          </label>
          {nonConformiteIdentifiee && (
            <FormField label="Description de la non-conformité" htmlFor="nonConformiteDescription">
              <Input id="nonConformiteDescription" {...register("nonConformiteDescription")} />
            </FormField>
          )}

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
