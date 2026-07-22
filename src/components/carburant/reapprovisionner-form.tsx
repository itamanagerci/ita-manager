"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reapprovisionner } from "@/lib/server-actions/carburant";
import {
  reapprovisionnerSchema,
  type ReapprovisionnerInput,
} from "@/types/validations/carburant";
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

interface ReapprovisionnerFormProps {
  depots: { id: string; nom: string }[];
}

export function ReapprovisionnerForm({ depots }: ReapprovisionnerFormProps) {
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
  } = useForm<ReapprovisionnerInput>({
    resolver: zodResolver(reapprovisionnerSchema),
    defaultValues: { depotId: depots[0]?.id ?? "" },
  });

  async function onSubmit(values: ReapprovisionnerInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await reapprovisionner(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Réapprovisionnement enregistré", "Le stock du dépôt a été mis à jour.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Réapprovisionner</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réapprovisionner un dépôt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Dépôt" htmlFor="depotId">
            <NativeSelect id="depotId" {...register("depotId")}>
              {depots.map((depot) => (
                <option key={depot.id} value={depot.id}>
                  {depot.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Quantité (litres)"
            htmlFor="quantiteLitres"
            error={errors.quantiteLitres?.message}
          >
            <Input
              id="quantiteLitres"
              type="number"
              min={1}
              {...register("quantiteLitres", { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Fournisseur" htmlFor="fournisseur" error={errors.fournisseur?.message}>
            <Input id="fournisseur" {...register("fournisseur")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement..." : "Réapprovisionner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
