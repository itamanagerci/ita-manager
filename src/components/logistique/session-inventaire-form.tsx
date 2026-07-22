"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerSessionInventaire } from "@/lib/server-actions/inventaire-periodique";
import {
  creerSessionInventaireSchema,
  type CreerSessionInventaireInput,
} from "@/types/validations/logistique";
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

interface SessionInventaireFormProps {
  magasins: { id: string; code: string; nom: string }[];
}

export function SessionInventaireForm({ magasins }: SessionInventaireFormProps) {
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
  } = useForm<CreerSessionInventaireInput>({
    resolver: zodResolver(creerSessionInventaireSchema),
    defaultValues: { type: "MENSUEL", magasinId: magasins[0]?.id ?? "" },
  });

  async function onSubmit(values: CreerSessionInventaireInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerSessionInventaire(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Session créée");
    router.push(`/dashboard/logistique/inventaire-periodique/${resultat.id}`);
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle session d&apos;inventaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Type d'inventaire" htmlFor="type" error={errors.type?.message}>
            <NativeSelect id="type" {...register("type")}>
              <option value="MENSUEL">Mensuel</option>
              <option value="TRIMESTRIEL">Trimestriel</option>
              <option value="SEMESTRIEL">Semestriel</option>
              <option value="ANNUEL">Annuel</option>
              <option value="EXCEPTIONNEL">Exceptionnel</option>
            </NativeSelect>
          </FormField>

          <FormField label="Magasin / site" htmlFor="magasinId" error={errors.magasinId?.message}>
            <NativeSelect id="magasinId" {...register("magasinId")}>
              {magasins.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Équipe de comptage" htmlFor="equipeComptage" helperText="Optionnel">
            <Input id="equipeComptage" {...register("equipeComptage")} />
          </FormField>

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
