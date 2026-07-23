"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerBonSortieTransfert } from "@/lib/server-actions/bon-sortie-transfert";
import {
  creerBonSortieTransfertSchema,
  type CreerBonSortieTransfertInput,
} from "@/types/validations/vehicules";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BonSortieTransfertFormProps {
  materiels: { id: string; designation: string }[];
}

const LIGNE_VIDE = { materielId: "", quantite: 1 };

export function BonSortieTransfertForm({ materiels }: BonSortieTransfertFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerBonSortieTransfertInput = {
    lieuSortie: "",
    motif: "",
    destination: "",
    receptionnaireNom: "",
    receptionnaireContact: "",
    lignes: [LIGNE_VIDE],
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerBonSortieTransfertInput>({
    resolver: zodResolver(creerBonSortieTransfertSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });

  async function onSubmit(values: CreerBonSortieTransfertInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerBonSortieTransfert(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Bon de sortie créé");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau bon de sortie</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bon de Sortie et Transfert</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Lieu de sortie" htmlFor="lieuSortie" error={errors.lieuSortie?.message}>
              <Input id="lieuSortie" {...register("lieuSortie")} />
            </FormField>
            <FormField label="Destination" htmlFor="destination" error={errors.destination?.message}>
              <Input id="destination" {...register("destination")} />
            </FormField>
          </div>

          <FormField label="Motif" htmlFor="motif" error={errors.motif?.message}>
            <Input id="motif" {...register("motif")} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Réceptionnaire (nom)"
              htmlFor="receptionnaireNom"
              error={errors.receptionnaireNom?.message}
            >
              <Input id="receptionnaireNom" {...register("receptionnaireNom")} />
            </FormField>
            <FormField
              label="Réceptionnaire (contact)"
              htmlFor="receptionnaireContact"
              error={errors.receptionnaireContact?.message}
            >
              <Input id="receptionnaireContact" {...register("receptionnaireContact")} />
            </FormField>
          </div>

          <FormField label="CIA" htmlFor="cia" helperText="Optionnel — centre d'imputation analytique">
            <Input id="cia" {...register("cia")} />
          </FormField>

          <Separator />

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Articles</p>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-4 gap-3 rounded-md border border-border p-3">
                <FormField
                  label="Article"
                  htmlFor={`lignes.${index}.materielId`}
                  error={errors.lignes?.[index]?.materielId?.message}
                  className="col-span-2"
                >
                  <NativeSelect id={`lignes.${index}.materielId`} {...register(`lignes.${index}.materielId`)}>
                    <option value="">Sélectionner…</option>
                    {materiels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.designation}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField
                  label="Quantité"
                  htmlFor={`lignes.${index}.quantite`}
                  error={errors.lignes?.[index]?.quantite?.message}
                >
                  <Input
                    id={`lignes.${index}.quantite`}
                    type="number"
                    min={1}
                    {...register(`lignes.${index}.quantite`, { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="État" htmlFor={`lignes.${index}.etat`}>
                  <Input id={`lignes.${index}.etat`} {...register(`lignes.${index}.etat`)} />
                </FormField>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-4 self-start"
                    onClick={() => remove(index)}
                  >
                    Retirer cette ligne
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(LIGNE_VIDE)}>
              Ajouter une ligne
            </Button>
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
