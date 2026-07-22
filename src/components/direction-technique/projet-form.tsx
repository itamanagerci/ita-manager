"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerProjet } from "@/lib/server-actions/gestion-projet";
import { creerProjetSchema, type CreerProjetInput } from "@/types/validations/direction-technique";
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

interface ProjetFormProps {
  utilisateurs: { id: string; nom: string; prenom: string }[];
}

export function ProjetForm({ utilisateurs }: ProjetFormProps) {
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
  } = useForm<CreerProjetInput>({
    resolver: zodResolver(creerProjetSchema),
    defaultValues: { chefProjetId: utilisateurs[0]?.id ?? "" },
  });

  async function onSubmit(values: CreerProjetInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerProjet(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Projet créé");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouveau projet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Nom" htmlFor="nom" error={errors.nom?.message}>
            <Input id="nom" {...register("nom")} />
          </FormField>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Input id="description" {...register("description")} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date de début" htmlFor="dateDebut" error={errors.dateDebut?.message}>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
            </FormField>
            <FormField label="Date de fin (optionnel)" htmlFor="dateFin">
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </FormField>
          </div>

          <FormField label="Chef de projet" htmlFor="chefProjetId">
            <NativeSelect id="chefProjetId" {...register("chefProjetId")}>
              {utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Création..." : "Créer le projet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
