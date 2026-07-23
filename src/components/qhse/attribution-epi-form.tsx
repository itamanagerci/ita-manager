"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerAttributionEPI } from "@/lib/server-actions/qhse-stock-epi";
import { creerAttributionEPISchema, type CreerAttributionEPIInput } from "@/types/validations/qhse";
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

interface AttributionEPIFormProps {
  materiels: { id: string; designation: string; quantiteStock: number | null }[];
  beneficiaires: { id: string; nom: string; prenom: string }[];
  projets: { id: string; nom: string }[];
}

export function AttributionEPIForm({ materiels, beneficiaires, projets }: AttributionEPIFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerAttributionEPIInput = {
    projetId: projets[0]?.id ?? "",
    beneficiaireId: beneficiaires[0]?.id ?? "",
    materielId: materiels[0]?.id ?? "",
    quantiteSortie: 1,
    retourEpiUsage: false,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerAttributionEPIInput>({ resolver: zodResolver(creerAttributionEPISchema), defaultValues });

  async function onSubmit(values: CreerAttributionEPIInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerAttributionEPI(values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("EPI attribué");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle attribution</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attribution d&apos;EPI</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Bénéficiaire" htmlFor="beneficiaireId">
            <NativeSelect id="beneficiaireId" {...register("beneficiaireId")}>
              {beneficiaires.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.prenom} {b.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Article EPI" htmlFor="materielId">
            <NativeSelect id="materielId" {...register("materielId")}>
              {materiels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.designation} (stock : {m.quantiteStock ?? 0})
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Quantité sortie" htmlFor="quantiteSortie" error={errors.quantiteSortie?.message}>
            <Input
              id="quantiteSortie"
              type="number"
              min={1}
              {...register("quantiteSortie", { valueAsNumber: true })}
            />
          </FormField>

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

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 rounded border-input" {...register("retourEpiUsage")} />
            EPI retourné/usagé
          </label>

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
