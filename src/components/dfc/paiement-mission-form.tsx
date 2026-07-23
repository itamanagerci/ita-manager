"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { executerPaiementMission } from "@/lib/server-actions/dfc-paiements";
import {
  executerPaiementMissionSchema,
  type ExecuterPaiementMissionInput,
} from "@/types/validations/dfc";
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

interface PaiementMissionFormProps {
  demandeMissionId: string;
}

export function PaiementMissionForm({ demandeMissionId }: PaiementMissionFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExecuterPaiementMissionInput>({
    resolver: zodResolver(executerPaiementMissionSchema),
    defaultValues: { demandeMissionId, mode: "VIREMENT" },
  });

  async function onSubmit(values: ExecuterPaiementMissionInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await executerPaiementMission(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    notifier.succes("Paiement exécuté");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button size="sm">Enregistrer le paiement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paiement des frais de mission</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            label="Mode de paiement"
            htmlFor="mode"
            helperText="La mission n'a pas défini de mode à l'avance — à choisir ici"
          >
            <NativeSelect id="mode" {...register("mode")}>
              <option value="CHEQUE">Chèque</option>
              <option value="VIREMENT">Virement</option>
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile money</option>
            </NativeSelect>
          </FormField>
          <FormField label="Référence de paiement" htmlFor="reference" error={errors.reference?.message}>
            <Input id="reference" {...register("reference")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Payer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
