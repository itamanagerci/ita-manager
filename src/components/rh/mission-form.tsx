"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeMission } from "@/lib/server-actions/rh-missions";
import {
  creerDemandeMissionSchema,
  type CreerDemandeMissionInput,
} from "@/types/validations/rh";
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

interface MissionFormProps {
  utilisateurCourantId: string;
  utilisateurs: { id: string; nom: string; prenom: string }[];
}

const TYPES_MISSION: { valeur: CreerDemandeMissionInput["typeMission"]; label: string }[] = [
  { valeur: "CHANTIER", label: "Chantier" },
  { valeur: "FORMATION", label: "Formation" },
  { valeur: "REPRESENTATION_CLIENT", label: "Représentation client" },
  { valeur: "AUTRE", label: "Autre" },
];

export function MissionForm({ utilisateurCourantId, utilisateurs }: MissionFormProps) {
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
  } = useForm<CreerDemandeMissionInput>({
    resolver: zodResolver(creerDemandeMissionSchema),
    defaultValues: { employeConcerneId: utilisateurCourantId, typeMission: "CHANTIER" },
  });

  async function onSubmit(values: CreerDemandeMissionInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerDemandeMission(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    notifier.succes("Mission soumise", "Votre demande a été transmise aux Ressources Humaines.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle mission</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de mission</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Employé concerné" htmlFor="employeConcerneId">
              <NativeSelect id="employeConcerneId" {...register("employeConcerneId")}>
                {utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Type de mission" htmlFor="typeMission">
              <NativeSelect id="typeMission" {...register("typeMission")}>
                {TYPES_MISSION.map((t) => (
                  <option key={t.valeur} value={t.valeur}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Input id="description" {...register("description")} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Lieu" htmlFor="lieu" error={errors.lieu?.message}>
              <Input id="lieu" {...register("lieu")} />
            </FormField>
            <FormField
              label="Frais déclarés (optionnel)"
              htmlFor="fraisDeclares"
              error={errors.fraisDeclares?.message}
            >
              <Input
                id="fraisDeclares"
                type="number"
                min={0}
                {...register("fraisDeclares", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date de début" htmlFor="dateDebut" error={errors.dateDebut?.message}>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
            </FormField>
            <FormField label="Date de fin" htmlFor="dateFin" error={errors.dateFin?.message}>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </FormField>
          </div>

          <FormField label="Motif des frais (optionnel)" htmlFor="motifFrais">
            <Input id="motifFrais" {...register("motifFrais")} />
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
