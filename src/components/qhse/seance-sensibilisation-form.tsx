"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ajouterSeanceSensibilisation } from "@/lib/server-actions/qhse-sensibilisation";
import { type AjouterSeanceSensibilisationInput } from "@/types/validations/qhse-incident";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SeanceSensibilisationFormProps {
  programmeId: string;
}

export function SeanceSensibilisationForm({ programmeId }: SeanceSensibilisationFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const { register, handleSubmit, reset } = useForm<AjouterSeanceSensibilisationInput>({
    defaultValues: { date: "", theme: "", animateur: "", commentaire: "" },
  });

  async function onSubmit(values: AjouterSeanceSensibilisationInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await ajouterSeanceSensibilisation(programmeId, values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Séance ajoutée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter une séance</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle séance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Date" htmlFor="date">
            <Input id="date" type="date" {...register("date", { required: true })} />
          </FormField>
          <FormField label="Thème" htmlFor="theme">
            <Input id="theme" {...register("theme", { required: true })} />
          </FormField>
          <FormField label="Animateur" htmlFor="animateur">
            <Input id="animateur" {...register("animateur", { required: true })} />
          </FormField>
          <FormField label="Commentaire" htmlFor="commentaire">
            <Input id="commentaire" {...register("commentaire")} />
          </FormField>
          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
