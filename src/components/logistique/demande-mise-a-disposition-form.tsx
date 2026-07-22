"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeMiseADisposition } from "@/lib/server-actions/flux-sortie";
import {
  creerDemandeMiseADispositionSchema,
  type CreerDemandeMiseADispositionInput,
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

interface DemandeMiseADispositionFormProps {
  magasins: { id: string; code: string; nom: string }[];
  materiels: { id: string; designation: string }[];
}

const LIGNE_VIDE = { materielId: "", quantiteDemandee: 1 };

export function DemandeMiseADispositionForm({ magasins, materiels }: DemandeMiseADispositionFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreerDemandeMiseADispositionInput>({
    resolver: zodResolver(creerDemandeMiseADispositionSchema),
    defaultValues: {
      magasinId: magasins[0]?.id ?? "",
      chantierService: "",
      urgence: "NORMAL",
      demandeurPoste: "",
      demandeurTelephone: "",
      lignes: [LIGNE_VIDE],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });
  const urgence = watch("urgence");

  async function onSubmit(values: CreerDemandeMiseADispositionInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeMiseADisposition(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset({
      magasinId: magasins[0]?.id ?? "",
      chantierService: "",
      urgence: "NORMAL",
      demandeurPoste: "",
      demandeurTelephone: "",
      lignes: [LIGNE_VIDE],
    });
    notifier.succes("Demande envoyée", "Transmise au Chef Magasin pour vérification.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande de mise à disposition</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Demande de Mise à Disposition Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Magasin" htmlFor="magasinId" error={errors.magasinId?.message}>
              <NativeSelect id="magasinId" {...register("magasinId")}>
                {magasins.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField
              label="Chantier / service"
              htmlFor="chantierService"
              error={errors.chantierService?.message}
            >
              <Input id="chantierService" {...register("chantierService")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Degré d'urgence" htmlFor="urgence">
              <NativeSelect id="urgence" {...register("urgence")}>
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </NativeSelect>
            </FormField>
            {urgence === "URGENT" && (
              <FormField
                label="Justification"
                htmlFor="justificationUrgence"
                error={errors.justificationUrgence?.message}
              >
                <Input id="justificationUrgence" {...register("justificationUrgence")} />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Poste / fonction"
              htmlFor="demandeurPoste"
              error={errors.demandeurPoste?.message}
            >
              <Input id="demandeurPoste" {...register("demandeurPoste")} />
            </FormField>
            <FormField
              label="Téléphone"
              htmlFor="demandeurTelephone"
              error={errors.demandeurTelephone?.message}
            >
              <Input id="demandeurTelephone" {...register("demandeurTelephone")} />
            </FormField>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Articles demandés
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
                  label="Quantité"
                  htmlFor={`lignes.${index}.quantiteDemandee`}
                  error={errors.lignes?.[index]?.quantiteDemandee?.message}
                >
                  <Input
                    id={`lignes.${index}.quantiteDemandee`}
                    type="number"
                    min={1}
                    {...register(`lignes.${index}.quantiteDemandee`, { valueAsNumber: true })}
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
              {enCours ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
