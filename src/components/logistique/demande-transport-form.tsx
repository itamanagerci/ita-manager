"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeTransport } from "@/lib/server-actions/demande-transport";
import {
  creerDemandeTransportSchema,
  type CreerDemandeTransportInput,
} from "@/types/validations/vehicules";
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

export function DemandeTransportForm() {
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
  } = useForm<CreerDemandeTransportInput>({
    resolver: zodResolver(creerDemandeTransportSchema),
    defaultValues: { nature: "MISE_A_DISPOSITION" },
  });

  async function onSubmit(values: CreerDemandeTransportInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeTransport(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Demande envoyée", "Transmise au Logisticien pour visa et affectation.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande de transport</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Demande de Transport / Mise à Disposition</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Service/chantier"
              htmlFor="serviceChantier"
              error={errors.serviceChantier?.message}
            >
              <Input id="serviceChantier" {...register("serviceChantier")} />
            </FormField>
            <FormField label="CIA" htmlFor="cia" error={errors.cia?.message} helperText="Centre d'imputation analytique">
              <Input id="cia" {...register("cia")} />
            </FormField>
          </div>

          <FormField label="Nature" htmlFor="nature">
            <NativeSelect id="nature" {...register("nature")}>
              <option value="MISE_A_DISPOSITION">Mise à disposition</option>
              <option value="TRANSPORT_TRANSFERT">Transport-Transfert</option>
            </NativeSelect>
          </FormField>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Input id="description" {...register("description")} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date de début" htmlFor="dateDebut" error={errors.dateDebut?.message}>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
            </FormField>
            <FormField label="Date de fin" htmlFor="dateFin" error={errors.dateFin?.message}>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </FormField>
          </div>

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
