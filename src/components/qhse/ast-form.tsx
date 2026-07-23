"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerAST } from "@/lib/server-actions/qhse-ast";
import { creerASTSchema, type CreerASTInput } from "@/types/validations/qhse";
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

interface ASTFormProps {
  projets: { id: string; nom: string }[];
}

const TACHE_VIDE = { ressources: "", risques: "", mesuresPrevention: "" };

export function ASTForm({ projets }: ASTFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerASTInput = { projetId: projets[0]?.id ?? "", taches: [TACHE_VIDE] };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerASTInput>({ resolver: zodResolver(creerASTSchema), defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: "taches" });

  async function onSubmit(values: CreerASTInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerAST(values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Fiche AST envoyée", "Transmise pour validation QHSE.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle AST</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analyse Sécuritaire des Tâches</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <FormField label="Chantier" htmlFor="projetId">
            <NativeSelect id="projetId" {...register("projetId")}>
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Chantier (texte libre)" htmlFor="chantierLibre" error={errors.chantierLibre?.message}>
            <Input id="chantierLibre" {...register("chantierLibre")} />
          </FormField>

          <Separator />

          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-3 rounded-md border border-border p-3">
              <p className="text-sm font-semibold">Tâche {index + 1}</p>
              <FormField
                label="Ressources (matériels/équipements disponibles)"
                htmlFor={`taches.${index}.ressources`}
                error={errors.taches?.[index]?.ressources?.message}
              >
                <Input id={`taches.${index}.ressources`} {...register(`taches.${index}.ressources`)} />
              </FormField>
              <FormField
                label="Risques associés"
                htmlFor={`taches.${index}.risques`}
                error={errors.taches?.[index]?.risques?.message}
              >
                <Input id={`taches.${index}.risques`} {...register(`taches.${index}.risques`)} />
              </FormField>
              <FormField
                label="Mesures de prévention/protection"
                htmlFor={`taches.${index}.mesuresPrevention`}
                error={errors.taches?.[index]?.mesuresPrevention?.message}
              >
                <Input id={`taches.${index}.mesuresPrevention`} {...register(`taches.${index}.mesuresPrevention`)} />
              </FormField>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => remove(index)}>
                  Retirer cette tâche
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(TACHE_VIDE)}>
            Ajouter une tâche
          </Button>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
