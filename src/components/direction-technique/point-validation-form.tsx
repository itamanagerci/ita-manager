"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ajouterPointValidation } from "@/lib/server-actions/gestion-projet";
import {
  ajouterPointValidationSchema,
  type AjouterPointValidationInput,
} from "@/types/validations/direction-technique";
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

interface PointValidationFormProps {
  projetId: string;
}

export function PointValidationForm({ projetId }: PointValidationFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AjouterPointValidationInput>({
    resolver: zodResolver(ajouterPointValidationSchema),
    defaultValues: { projetId },
  });

  async function onSubmit(values: AjouterPointValidationInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await ajouterPointValidation(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset({ projetId });
    notifier.succes("Point de validation ajouté");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter un point</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un point de validation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input type="hidden" {...register("projetId")} />

          <FormField label="Libellé" htmlFor="libelle" error={errors.libelle?.message}>
            <Input id="libelle" {...register("libelle")} />
          </FormField>

          <FormField label="Échéance" htmlFor="echeance" error={errors.echeance?.message}>
            <Input id="echeance" type="date" {...register("echeance")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
