"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerNonConformiteManuelle } from "@/lib/server-actions/qhse-non-conformite";
import {
  creerNonConformiteManuelleSchema,
  type CreerNonConformiteManuelleInput,
} from "@/types/validations/qhse";
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

export function NonConformiteForm() {
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
  } = useForm<CreerNonConformiteManuelleInput>({
    resolver: zodResolver(creerNonConformiteManuelleSchema),
    defaultValues: { typeNonConformite: "INSPECTION_VISUELLE" },
  });

  async function onSubmit(values: CreerNonConformiteManuelleInput) {
    setErreur(null);
    setEnCours(true);
    const resultat = await creerNonConformiteManuelle(values);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Non-conformité créée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle non-conformité</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fiche de Non-Conformité</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Type de non-conformité" htmlFor="typeNonConformite">
            <NativeSelect id="typeNonConformite" {...register("typeNonConformite")}>
              <option value="RECLAMATION">Réclamation</option>
              <option value="NON_RESPECT_EXIGENCE">Non-respect d&apos;une exigence</option>
              <option value="AUDIT_EXTERNE">Audit externe</option>
              <option value="INSPECTION_VISUELLE">Inspection visuelle</option>
              <option value="CONTROLE_QUALITE">Contrôle Qualité</option>
              <option value="INDICATEUR_NON_ATTEINT">Indicateur non atteint</option>
            </NativeSelect>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Processus" htmlFor="processus">
              <Input id="processus" {...register("processus")} />
            </FormField>
            <FormField label="Norme / Doc. de référence" htmlFor="normeDocReference">
              <Input id="normeDocReference" {...register("normeDocReference")} />
            </FormField>
          </div>
          <FormField label="Réf. exigence" htmlFor="refExigence">
            <Input id="refExigence" {...register("refExigence")} />
          </FormField>

          <FormField
            label="Description de la non-conformité"
            htmlFor="descriptionNonConformite"
            error={errors.descriptionNonConformite?.message}
          >
            <Input id="descriptionNonConformite" {...register("descriptionNonConformite")} />
          </FormField>
          <FormField label="Preuve" htmlFor="preuveDescription">
            <Input id="preuveDescription" {...register("preuveDescription")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
