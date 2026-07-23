"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { mettreAJourPlanActionNonConformite } from "@/lib/server-actions/qhse-non-conformite";
import { type MettreAJourPlanActionNonConformiteInput } from "@/types/validations/qhse";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

interface PlanActionNonConformiteFormProps {
  nonConformiteId: string;
  valeursInitiales: {
    correctionContenu: string | null;
    correctionDelai: Date | null;
    analyseCausesContenu: string | null;
    analyseCausesDelai: Date | null;
    actionsCorrectivesContenu: string | null;
    actionsCorrectivesDelai: Date | null;
    dateAchevement: Date | null;
  };
}

export function PlanActionNonConformiteForm({
  nonConformiteId,
  valeursInitiales,
}: PlanActionNonConformiteFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const { register, handleSubmit } = useForm<Omit<MettreAJourPlanActionNonConformiteInput, "nonConformiteId">>({
    defaultValues: {
      correctionContenu: valeursInitiales.correctionContenu ?? "",
      correctionDelai: valeursInitiales.correctionDelai?.toISOString().slice(0, 10) ?? "",
      analyseCausesContenu: valeursInitiales.analyseCausesContenu ?? "",
      analyseCausesDelai: valeursInitiales.analyseCausesDelai?.toISOString().slice(0, 10) ?? "",
      actionsCorrectivesContenu: valeursInitiales.actionsCorrectivesContenu ?? "",
      actionsCorrectivesDelai: valeursInitiales.actionsCorrectivesDelai?.toISOString().slice(0, 10) ?? "",
      dateAchevement: valeursInitiales.dateAchevement?.toISOString().slice(0, 10) ?? "",
    },
  });

  async function onSubmit(values: Omit<MettreAJourPlanActionNonConformiteInput, "nonConformiteId">) {
    setErreur(null);
    setEnCours(true);
    const resultat = await mettreAJourPlanActionNonConformite({ nonConformiteId, ...values });
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes("Plan d'action mis à jour");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Correction(s)" htmlFor="correctionContenu">
          <Input id="correctionContenu" {...register("correctionContenu")} />
        </FormField>
        <FormField label="Délai" htmlFor="correctionDelai">
          <Input id="correctionDelai" type="date" {...register("correctionDelai")} />
        </FormField>
        <FormField label="Analyse des causes" htmlFor="analyseCausesContenu">
          <Input id="analyseCausesContenu" {...register("analyseCausesContenu")} />
        </FormField>
        <FormField label="Délai" htmlFor="analyseCausesDelai">
          <Input id="analyseCausesDelai" type="date" {...register("analyseCausesDelai")} />
        </FormField>
        <FormField label="Action(s) corrective(s)" htmlFor="actionsCorrectivesContenu">
          <Input id="actionsCorrectivesContenu" {...register("actionsCorrectivesContenu")} />
        </FormField>
        <FormField label="Délai" htmlFor="actionsCorrectivesDelai">
          <Input id="actionsCorrectivesDelai" type="date" {...register("actionsCorrectivesDelai")} />
        </FormField>
      </div>

      <FormField label="Date d'achèvement" htmlFor="dateAchevement">
        <Input id="dateAchevement" type="date" {...register("dateAchevement")} />
      </FormField>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement..." : "Enregistrer le plan d'action"}
      </Button>
    </form>
  );
}
