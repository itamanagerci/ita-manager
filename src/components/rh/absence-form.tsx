"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeAbsence } from "@/lib/server-actions/rh-absences";
import {
  creerDemandeAbsenceSchema,
  type CreerDemandeAbsenceInput,
} from "@/types/validations/rh";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AbsenceForm() {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreerDemandeAbsenceInput>({
    resolver: zodResolver(creerDemandeAbsenceSchema),
    defaultValues: { type: "CONGE" },
  });

  const type = watch("type");

  async function onSubmit(values: CreerDemandeAbsenceInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeAbsence(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Demande envoyée", "Votre demande a été transmise à votre supérieur.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle demande de congé / permission</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Type" htmlFor="type">
            <NativeSelect id="type" {...register("type")}>
              <option value="CONGE">Congé</option>
              <option value="PERMISSION">Permission</option>
            </NativeSelect>
          </FormField>

          <FormField label="Date de début" htmlFor="dateDebut" error={errors.dateDebut?.message}>
            <Input id="dateDebut" type="date" {...register("dateDebut")} />
          </FormField>

          {type === "CONGE" ? (
            <FormField label="Date de fin" htmlFor="dateFin" error={errors.dateFin?.message}>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </FormField>
          ) : (
            <FormField
              label="Durée (heures)"
              htmlFor="dureeHeures"
              error={errors.dureeHeures?.message}
            >
              <Input
                id="dureeHeures"
                type="number"
                min={1}
                {...register("dureeHeures", { valueAsNumber: true })}
              />
            </FormField>
          )}

          <FormField label="Motif" htmlFor="motif" error={errors.motif?.message}>
            <Input id="motif" {...register("motif")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
