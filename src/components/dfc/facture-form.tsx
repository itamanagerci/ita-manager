"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { enregistrerFacture } from "@/lib/server-actions/dfc-paiements";
import { enregistrerFactureSchema, type EnregistrerFactureInput } from "@/types/validations/dfc";
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

interface FactureFormProps {
  bonDeCommandeId: string;
}

export function FactureForm({ bonDeCommandeId }: FactureFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnregistrerFactureInput>({
    resolver: zodResolver(enregistrerFactureSchema),
    defaultValues: { bonDeCommandeId, referenceFournisseur: "", dateFacture: "" },
  });

  async function onSubmit(values: EnregistrerFactureInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await enregistrerFacture(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    notifier.succes("Facture enregistrée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button size="sm">Enregistrer la facture</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer la facture reçue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            label="Référence fournisseur"
            htmlFor="referenceFournisseur"
            error={errors.referenceFournisseur?.message}
          >
            <Input id="referenceFournisseur" {...register("referenceFournisseur")} />
          </FormField>
          <FormField label="Montant (F CFA TTC)" htmlFor="montant" error={errors.montant?.message}>
            <Input id="montant" type="number" min={0} {...register("montant", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Date de la facture" htmlFor="dateFacture" error={errors.dateFacture?.message}>
            <Input id="dateFacture" type="date" {...register("dateFacture")} />
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
