"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerBonEntreeMagasin } from "@/lib/server-actions/flux-entree";
import {
  creerBonEntreeMagasinSchema,
  type CreerBonEntreeMagasinInput,
} from "@/types/validations/logistique";
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

interface BonEntreeFormProps {
  magasins: { id: string; code: string; nom: string }[];
  materiels: { id: string; designation: string }[];
}

const LIGNE_VIDE = { materielId: "", quantiteRecue: 1 };

export function BonEntreeForm({ magasins, materiels }: BonEntreeFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerBonEntreeMagasinInput = {
    bonLivraisonFournisseurNumero: "",
    dateReception: "",
    magasinId: magasins[0]?.id ?? "",
    fournisseur: "",
    lignes: [LIGNE_VIDE],
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerBonEntreeMagasinInput>({
    resolver: zodResolver(creerBonEntreeMagasinSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });

  async function onSubmit(values: CreerBonEntreeMagasinInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerBonEntreeMagasin(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Bon d'entrée enregistré", "Transmis au Logisticien pour validation.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau bon d&apos;entrée</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bon d&apos;Entrée Magasin</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="N° bon de livraison fournisseur"
              htmlFor="bonLivraisonFournisseurNumero"
              error={errors.bonLivraisonFournisseurNumero?.message}
            >
              <Input
                id="bonLivraisonFournisseurNumero"
                {...register("bonLivraisonFournisseurNumero")}
              />
            </FormField>
            <FormField
              label="Date de réception"
              htmlFor="dateReception"
              error={errors.dateReception?.message}
            >
              <Input id="dateReception" type="date" {...register("dateReception")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Magasin de destination" htmlFor="magasinId" error={errors.magasinId?.message}>
              <NativeSelect id="magasinId" {...register("magasinId")}>
                {magasins.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Fournisseur" htmlFor="fournisseur" error={errors.fournisseur?.message}>
              <Input id="fournisseur" {...register("fournisseur")} />
            </FormField>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Articles reçus
            </p>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
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
                  label="Quantité reçue"
                  htmlFor={`lignes.${index}.quantiteRecue`}
                  error={errors.lignes?.[index]?.quantiteRecue?.message}
                >
                  <Input
                    id={`lignes.${index}.quantiteRecue`}
                    type="number"
                    min={1}
                    {...register(`lignes.${index}.quantiteRecue`, { valueAsNumber: true })}
                  />
                </FormField>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-3 self-start"
                    onClick={() => remove(index)}
                  >
                    Retirer cette ligne
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => append(LIGNE_VIDE)}
            >
              Ajouter une ligne
            </Button>
          </div>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
