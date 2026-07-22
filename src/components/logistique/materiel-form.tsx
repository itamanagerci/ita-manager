"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerMateriel } from "@/lib/server-actions/fiche-inventaire";
import { creerMaterielSchema, type CreerMaterielInput } from "@/types/validations/logistique";
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

interface MaterielFormProps {
  categories: { id: string; nom: string }[];
  unitesMesure: { id: string; nom: string }[];
  magasins: { id: string; code: string; nom: string }[];
}

export function MaterielForm({ categories, unitesMesure, magasins }: MaterielFormProps) {
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
  } = useForm<CreerMaterielInput>({
    resolver: zodResolver(creerMaterielSchema),
    defaultValues: {
      categorieId: categories[0]?.id ?? "",
      uniteMesureId: unitesMesure[0]?.id ?? "",
      magasinId: magasins[0]?.id ?? "",
      quantiteStock: 0,
    },
  });

  async function onSubmit(values: CreerMaterielInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerMateriel(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Article créé");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvel article</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvel article</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Référence" htmlFor="reference" helperText="Optionnel">
              <Input id="reference" {...register("reference")} />
            </FormField>
            <FormField label="Désignation" htmlFor="designation" error={errors.designation?.message}>
              <Input id="designation" {...register("designation")} />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Catégorie" htmlFor="categorieId" error={errors.categorieId?.message}>
              <NativeSelect id="categorieId" {...register("categorieId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Unité de mesure" htmlFor="uniteMesureId" error={errors.uniteMesureId?.message}>
              <NativeSelect id="uniteMesureId" {...register("uniteMesureId")}>
                {unitesMesure.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Magasin" htmlFor="magasinId" error={errors.magasinId?.message}>
              <NativeSelect id="magasinId" {...register("magasinId")}>
                {magasins.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Emplacement" htmlFor="emplacement" helperText="Zone / allée / étagère">
              <Input id="emplacement" {...register("emplacement")} />
            </FormField>
            <FormField label="Fournisseur habituel" htmlFor="fournisseurHabituel">
              <Input id="fournisseurHabituel" {...register("fournisseurHabituel")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Stock initial"
              htmlFor="quantiteStock"
              error={errors.quantiteStock?.message}
            >
              <Input
                id="quantiteStock"
                type="number"
                min={0}
                {...register("quantiteStock", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Seuil d'alerte"
              htmlFor="seuilAlerte"
              error={errors.seuilAlerte?.message}
              helperText="Optionnel"
            >
              <Input
                id="seuilAlerte"
                type="number"
                min={0}
                {...register("seuilAlerte", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField
              label="Stock de sécurité"
              htmlFor="stockSecurite"
              helperText="Recommandé = seuil ÷ 2"
            >
              <Input
                id="stockSecurite"
                type="number"
                min={0}
                {...register("stockSecurite", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Quantité réappro standard" htmlFor="quantiteReapproStandard">
              <Input
                id="quantiteReapproStandard"
                type="number"
                min={0}
                {...register("quantiteReapproStandard", { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Délai fournisseur moyen (jours)" htmlFor="delaiFournisseurMoyenJours">
              <Input
                id="delaiFournisseurMoyenJours"
                type="number"
                min={0}
                {...register("delaiFournisseurMoyenJours", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Création..." : "Créer l'article"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
