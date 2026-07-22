"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeRHProjet } from "@/lib/server-actions/demande-rh-projet";
import {
  creerDemandeRHProjetSchema,
  type CreerDemandeRHProjetInput,
} from "@/types/validations/direction-technique";
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

interface DemandeRHProjetFormProps {
  projets: { id: string; nom: string }[];
}

const LIGNE_VIDE = { competence: "", periode: "", tauxJournalierPropose: 0 };

export function DemandeRHProjetForm({ projets }: DemandeRHProjetFormProps) {
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
    formState: { errors },
  } = useForm<CreerDemandeRHProjetInput>({
    resolver: zodResolver(creerDemandeRHProjetSchema),
    defaultValues: { projetId: projets[0]?.id ?? "", lignes: [LIGNE_VIDE] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });

  async function onSubmit(values: CreerDemandeRHProjetInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeRHProjet(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset({ projetId: projets[0]?.id ?? "", lignes: [LIGNE_VIDE] });
    notifier.succes("Demande envoyée", "Transmise aux Ressources Humaines.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande RH</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de ressource humaine</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Projet" htmlFor="projetId">
            <NativeSelect id="projetId" {...register("projetId")}>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <Separator />

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Profils demandés
            </p>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
                <FormField
                  label="Compétence"
                  htmlFor={`lignes.${index}.competence`}
                  error={errors.lignes?.[index]?.competence?.message}
                >
                  <Input id={`lignes.${index}.competence`} {...register(`lignes.${index}.competence`)} />
                </FormField>
                <FormField
                  label="Période"
                  htmlFor={`lignes.${index}.periode`}
                  error={errors.lignes?.[index]?.periode?.message}
                >
                  <Input id={`lignes.${index}.periode`} {...register(`lignes.${index}.periode`)} />
                </FormField>
                <FormField
                  label="Taux journalier"
                  htmlFor={`lignes.${index}.tauxJournalierPropose`}
                  error={errors.lignes?.[index]?.tauxJournalierPropose?.message}
                >
                  <Input
                    id={`lignes.${index}.tauxJournalierPropose`}
                    type="number"
                    min={0}
                    {...register(`lignes.${index}.tauxJournalierPropose`, { valueAsNumber: true })}
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
