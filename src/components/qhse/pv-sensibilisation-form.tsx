"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerPVSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import {
  creerPVSensibilisationSchema,
  type CreerPVSensibilisationInput,
} from "@/types/validations/qhse-incident";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import { CheckboxListe } from "@/components/qhse/checkbox-liste";

const SUJETS_ABORDES = [
  "Consignes HSE",
  "Port des EPI",
  "Consommation substances",
  "Dangers et risques QSE",
  "Signalétique - Balisage",
  "Comportement - vigilance",
  "Politique et objectifs QSE",
  "Hygiène et rangement",
  "Circulation",
  "Répercussions du non-respect QSE",
  "Droit de retrait",
  "Événements indésirables et résultats d'analyse",
  "Gestion des déchets",
  "Contribution au SMIQSE",
  "Gestes et postures",
  "Aspects et impacts environnementaux",
];

interface PVSensibilisationFormProps {
  seanceId: string;
  animateurDefaut: string;
  dateDefaut: string;
}

const PARTICIPANT_VIDE = { numero: 1, nom: "", poste: "", aSigne: false };

export function PVSensibilisationForm({ seanceId, animateurDefaut, dateDefaut }: PVSensibilisationFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [sujetsAbordes, setSujetsAbordes] = useState<string[]>([]);

  const defaultValues: CreerPVSensibilisationInput = {
    animateur: animateurDefaut,
    date: dateDefaut,
    chantierType: "CHANTIER",
    sujetsAbordes: [],
    participants: [PARTICIPANT_VIDE],
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreerPVSensibilisationInput>({
    resolver: zodResolver(creerPVSensibilisationSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "participants" });

  async function onSubmit(values: CreerPVSensibilisationInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerPVSensibilisation(seanceId, { ...values, sujetsAbordes });
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes("Procès-verbal créé");
    router.push(`/dashboard/qhse/programme-sensibilisation`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Animateur" htmlFor="animateur" error={errors.animateur?.message}>
          <Input id="animateur" {...register("animateur")} />
        </FormField>
        <FormField label="Date" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" {...register("date")} />
        </FormField>
        <FormField label="Heure" htmlFor="heure">
          <Input id="heure" type="time" {...register("heure")} />
        </FormField>
        <FormField label="Lieu" htmlFor="lieu">
          <Input id="lieu" {...register("lieu")} />
        </FormField>
        <FormField label="Chantier / Bureaux / Garage / Autre" htmlFor="chantierType">
          <NativeSelect id="chantierType" {...register("chantierType")}>
            <option value="CHANTIER">Chantier</option>
            <option value="BUREAUX">Bureaux</option>
            <option value="GARAGE">Garage</option>
            <option value="AUTRE">Autre</option>
          </NativeSelect>
        </FormField>
      </div>

      <CheckboxListe label="Sujets abordés" options={SUJETS_ABORDES} values={sujetsAbordes} onChange={setSujetsAbordes} />
      <FormField label="Autre (précisez)" htmlFor="sujetsAbordesAutrePrecision">
        <Input id="sujetsAbordesAutrePrecision" {...register("sujetsAbordesAutrePrecision")} />
      </FormField>

      <FormField label="Points spécifiques abordés" htmlFor="pointsSpecifiquesAbordes">
        <Input id="pointsSpecifiquesAbordes" {...register("pointsSpecifiquesAbordes")} />
      </FormField>

      <Separator />
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Participants</p>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-4 gap-3 rounded-md border border-border p-3">
          <FormField label="N°" htmlFor={`participants.${index}.numero`}>
            <Input id={`participants.${index}.numero`} type="number" min={1} {...register(`participants.${index}.numero`, { valueAsNumber: true })} />
          </FormField>
          <FormField label="Nom" htmlFor={`participants.${index}.nom`} error={errors.participants?.[index]?.nom?.message}>
            <Input id={`participants.${index}.nom`} {...register(`participants.${index}.nom`)} />
          </FormField>
          <FormField label="Poste" htmlFor={`participants.${index}.poste`}>
            <Input id={`participants.${index}.poste`} {...register(`participants.${index}.poste`)} />
          </FormField>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="size-4 rounded border-input" {...register(`participants.${index}.aSigne`)} />
            A signé
          </label>
          {fields.length > 1 && (
            <Button type="button" variant="ghost" size="sm" className="col-span-4 self-start" onClick={() => remove(index)}>
              Retirer ce participant
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({ ...PARTICIPANT_VIDE, numero: fields.length + 1 })}
      >
        Ajouter un participant
      </Button>

      <FormField label="Résumé de la sensibilisation" htmlFor="resumeSensibilisation">
        <Input id="resumeSensibilisation" {...register("resumeSensibilisation")} />
      </FormField>
      <FormField label="Observation" htmlFor="observation">
        <Input id="observation" {...register("observation")} />
      </FormField>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Envoi..." : "Créer le procès-verbal"}
      </Button>
    </form>
  );
}
