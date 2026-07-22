"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerReleveActivite } from "@/lib/server-actions/rh-releves";
import {
  creerReleveActiviteSchema,
  type CreerReleveActiviteInput,
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

interface ReleveFormProps {
  ouvriers: { id: string; nom: string; prenom: string }[];
}

export function ReleveForm({ ouvriers }: ReleveFormProps) {
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
  } = useForm<CreerReleveActiviteInput>({
    resolver: zodResolver(creerReleveActiviteSchema),
    defaultValues: { ouvrierId: ouvriers[0]?.id ?? "" },
  });

  async function onSubmit(values: CreerReleveActiviteInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerReleveActivite(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Relevé enregistré", "Le relevé a été transmis pour validation RH.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau relevé</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir un relevé d&apos;activité</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Ouvrier" htmlFor="ouvrierId">
            <NativeSelect id="ouvrierId" {...register("ouvrierId")}>
              {ouvriers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.prenom} {o.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Projet"
            htmlFor="projetLibelle"
            error={errors.projetLibelle?.message}
            helperText="Texte libre en attendant le référentiel Projet (Lot 5)"
          >
            <Input id="projetLibelle" {...register("projetLibelle")} />
          </FormField>

          <FormField label="Période" htmlFor="periode" error={errors.periode?.message}>
            <Input id="periode" placeholder="Ex. Semaine du 01/07 au 07/07" {...register("periode")} />
          </FormField>

          <FormField
            label="Jours travaillés"
            htmlFor="joursTravailles"
            error={errors.joursTravailles?.message}
          >
            <Input
              id="joursTravailles"
              type="number"
              min={1}
              {...register("joursTravailles", { valueAsNumber: true })}
            />
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
