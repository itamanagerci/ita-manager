"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeCarburant } from "@/lib/server-actions/carburant";
import {
  creerDemandeCarburantSchema,
  type CreerDemandeCarburantInput,
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

interface NouvelleDemandeFormProps {
  vehicules: { id: string; immatriculation: string }[];
  depots: { id: string; nom: string }[];
}

export function NouvelleDemandeForm({ vehicules, depots }: NouvelleDemandeFormProps) {
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
  } = useForm<CreerDemandeCarburantInput>({
    resolver: zodResolver(creerDemandeCarburantSchema),
    defaultValues: { vehiculeId: vehicules[0]?.id ?? "", depotSourceId: depots[0]?.id ?? "" },
  });

  async function onSubmit(values: CreerDemandeCarburantInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeCarburant(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Demande envoyée", "Votre demande de carburant a été transmise à Logistique.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de carburant</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Véhicule" htmlFor="vehiculeId">
              <NativeSelect id="vehiculeId" {...register("vehiculeId")}>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Dépôt" htmlFor="depotSourceId">
              <NativeSelect id="depotSourceId" {...register("depotSourceId")}>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Kilométrage compteur"
              htmlFor="kilometrageCompteur"
              error={errors.kilometrageCompteur?.message}
            >
              <Input
                id="kilometrageCompteur"
                type="number"
                min={0}
                {...register("kilometrageCompteur", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Quantité demandée (litres)"
              htmlFor="quantiteDemandeeLitres"
              error={errors.quantiteDemandeeLitres?.message}
            >
              <Input
                id="quantiteDemandeeLitres"
                type="number"
                min={1}
                {...register("quantiteDemandeeLitres", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <FormField
            label="Chantier / mission"
            htmlFor="chantierMission"
            error={errors.chantierMission?.message}
          >
            <Input id="chantierMission" {...register("chantierMission")} />
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
