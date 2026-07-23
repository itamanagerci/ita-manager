"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerProgrammeSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import {
  creerProgrammeSensibilisationSchema,
  type CreerProgrammeSensibilisationInput,
} from "@/types/validations/qhse-incident";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProgrammeSensibilisationFormProps {
  projets: { id: string; nom: string }[];
}

const SEANCE_VIDE = { date: "", theme: "", animateur: "", commentaire: "" };

export function ProgrammeSensibilisationForm({ projets }: ProgrammeSensibilisationFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerProgrammeSensibilisationInput = {
    projetId: projets[0]?.id ?? "",
    periodeDu: "",
    periodeAu: "",
    seances: [SEANCE_VIDE],
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerProgrammeSensibilisationInput>({
    resolver: zodResolver(creerProgrammeSensibilisationSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "seances" });

  async function onSubmit(values: CreerProgrammeSensibilisationInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerProgrammeSensibilisation(values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Programme de sensibilisation créé");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau programme</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Programme de Sensibilisation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Période du" htmlFor="periodeDu" error={errors.periodeDu?.message}>
              <Input id="periodeDu" type="date" {...register("periodeDu")} />
            </FormField>
            <FormField label="Au" htmlFor="periodeAu" error={errors.periodeAu?.message}>
              <Input id="periodeAu" type="date" {...register("periodeAu")} />
            </FormField>
          </div>

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Séances planifiées</p>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
              <FormField label="Date" htmlFor={`seances.${index}.date`} error={errors.seances?.[index]?.date?.message}>
                <Input id={`seances.${index}.date`} type="date" {...register(`seances.${index}.date`)} />
              </FormField>
              <FormField
                label="Thème"
                htmlFor={`seances.${index}.theme`}
                error={errors.seances?.[index]?.theme?.message}
              >
                <Input id={`seances.${index}.theme`} {...register(`seances.${index}.theme`)} />
              </FormField>
              <FormField
                label="Animateur"
                htmlFor={`seances.${index}.animateur`}
                error={errors.seances?.[index]?.animateur?.message}
              >
                <Input id={`seances.${index}.animateur`} {...register(`seances.${index}.animateur`)} />
              </FormField>
              <FormField label="Commentaire" htmlFor={`seances.${index}.commentaire`} className="col-span-3">
                <Input id={`seances.${index}.commentaire`} {...register(`seances.${index}.commentaire`)} />
              </FormField>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="col-span-3 self-start" onClick={() => remove(index)}>
                  Retirer cette séance
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(SEANCE_VIDE)}>
            Ajouter une séance
          </Button>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Créer le programme"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
