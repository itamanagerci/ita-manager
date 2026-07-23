"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerRapportHebdoQHSE } from "@/lib/server-actions/qhse-rapport-hebdo";
import {
  creerRapportHebdoQHSESchema,
  type CreerRapportHebdoQHSEInput,
} from "@/types/validations/qhse";
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

interface RapportHebdoFormProps {
  projets: { id: string; nom: string }[];
}

const JOURS: { champ: keyof CreerRapportHebdoQHSEInput; label: string }[] = [
  { champ: "effectifVendredi", label: "Vendredi" },
  { champ: "effectifSamedi", label: "Samedi" },
  { champ: "effectifLundi", label: "Lundi" },
  { champ: "effectifMardi", label: "Mardi" },
  { champ: "effectifMercredi", label: "Mercredi" },
  { champ: "effectifJeudi", label: "Jeudi" },
];

export function RapportHebdoForm({ projets }: RapportHebdoFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerRapportHebdoQHSEInput = {
    projetId: projets[0]?.id ?? "",
    semaineDu: "",
    semaineAu: "",
    effectifVendredi: 0,
    effectifSamedi: 0,
    effectifLundi: 0,
    effectifMardi: 0,
    effectifMercredi: 0,
    effectifJeudi: 0,
    activitesQHSE: "",
    constatsEffectues: "",
    propositionsRecommandations: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerRapportHebdoQHSEInput>({
    resolver: zodResolver(creerRapportHebdoQHSESchema),
    defaultValues,
  });

  async function onSubmit(values: CreerRapportHebdoQHSEInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerRapportHebdoQHSE(values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Rapport hebdomadaire enregistré");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau rapport</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rapport HSE Chantier — Hebdomadaire</DialogTitle>
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
            <FormField label="Semaine du" htmlFor="semaineDu" error={errors.semaineDu?.message}>
              <Input id="semaineDu" type="date" {...register("semaineDu")} />
            </FormField>
            <FormField label="Au" htmlFor="semaineAu" error={errors.semaineAu?.message}>
              <Input id="semaineAu" type="date" {...register("semaineAu")} />
            </FormField>
          </div>

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Effectifs présents par jour
          </p>
          <div className="grid grid-cols-3 gap-3">
            {JOURS.map((jour) => (
              <FormField key={jour.champ} label={jour.label} htmlFor={jour.champ}>
                <Input id={jour.champ} type="number" min={0} {...register(jour.champ, { valueAsNumber: true })} />
              </FormField>
            ))}
          </div>

          <Separator />
          <FormField label="Activités QHSE" htmlFor="activitesQHSE" error={errors.activitesQHSE?.message}>
            <Input id="activitesQHSE" {...register("activitesQHSE")} />
          </FormField>
          <FormField label="Constats effectués" htmlFor="constatsEffectues" error={errors.constatsEffectues?.message}>
            <Input id="constatsEffectues" {...register("constatsEffectues")} />
          </FormField>
          <FormField
            label="Propositions et recommandations"
            htmlFor="propositionsRecommandations"
            error={errors.propositionsRecommandations?.message}
          >
            <Input id="propositionsRecommandations" {...register("propositionsRecommandations")} />
          </FormField>

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
