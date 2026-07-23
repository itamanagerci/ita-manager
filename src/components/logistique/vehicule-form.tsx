"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerVehicule } from "@/lib/server-actions/vehicules";
import { creerVehiculeSchema, type CreerVehiculeInput } from "@/types/validations/vehicules";
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

export function VehiculeForm() {
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
  } = useForm<CreerVehiculeInput>({
    resolver: zodResolver(creerVehiculeSchema),
    defaultValues: { type: "LEGER", quotaMensuelLitres: 300 },
  });

  async function onSubmit(values: CreerVehiculeInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerVehicule(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Véhicule/engin créé");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau véhicule/engin</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau véhicule/engin</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Immatriculation"
              htmlFor="immatriculation"
              error={errors.immatriculation?.message}
            >
              <Input id="immatriculation" {...register("immatriculation")} />
            </FormField>
            <FormField label="Type" htmlFor="type">
              <NativeSelect id="type" {...register("type")}>
                <option value="LEGER">Léger</option>
                <option value="LOURD">Lourd (PL)</option>
                <option value="ENGIN">Engin</option>
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Marque" htmlFor="marque">
              <Input id="marque" {...register("marque")} />
            </FormField>
            <FormField label="Modèle" htmlFor="modele">
              <Input id="modele" {...register("modele")} />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="N° interne" htmlFor="numeroInterne">
              <Input id="numeroInterne" {...register("numeroInterne")} />
            </FormField>
            <FormField label="Année" htmlFor="annee">
              <Input id="annee" type="number" {...register("annee", { valueAsNumber: true })} />
            </FormField>
            <FormField
              label="Quota mensuel (L)"
              htmlFor="quotaMensuelLitres"
              error={errors.quotaMensuelLitres?.message}
            >
              <Input
                id="quotaMensuelLitres"
                type="number"
                min={0}
                {...register("quotaMensuelLitres", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date d'entrée" htmlFor="dateEntree">
              <Input id="dateEntree" type="date" {...register("dateEntree")} />
            </FormField>
            <FormField label="Mode d'acquisition" htmlFor="modeAcquisition">
              <Input id="modeAcquisition" {...register("modeAcquisition")} />
            </FormField>
          </div>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
