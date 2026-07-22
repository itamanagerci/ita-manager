"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeMateriel } from "@/lib/server-actions/demande-materiel";
import {
  creerDemandeMaterielSchema,
  type CreerDemandeMaterielInput,
} from "@/types/validations/direction-technique";
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

interface DemandeMaterielFormProps {
  projets: { id: string; nom: string }[];
  materiels: { id: string; designation: string }[];
}

export function DemandeMaterielForm({ projets, materiels }: DemandeMaterielFormProps) {
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
  } = useForm<CreerDemandeMaterielInput>({
    resolver: zodResolver(creerDemandeMaterielSchema),
    defaultValues: { projetId: projets[0]?.id ?? "", materielId: materiels[0]?.id ?? "" },
  });

  async function onSubmit(values: CreerDemandeMaterielInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeMateriel(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Demande envoyée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle demande</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle demande de matériel</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Projet (optionnel)" htmlFor="projetId">
            <NativeSelect id="projetId" {...register("projetId")}>
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Chantier (texte libre, si pas de projet)"
            htmlFor="chantierLibre"
            error={errors.chantierLibre?.message}
          >
            <Input id="chantierLibre" {...register("chantierLibre")} />
          </FormField>

          <FormField label="Matériel" htmlFor="materielId">
            <NativeSelect id="materielId" {...register("materielId")}>
              {materiels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.designation}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Délai souhaité" htmlFor="delaiSouhaite" error={errors.delaiSouhaite?.message}>
            <Input id="delaiSouhaite" type="date" {...register("delaiSouhaite")} />
          </FormField>

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
