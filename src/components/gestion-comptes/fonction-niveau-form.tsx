"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { modifierFonctionEtNiveauUtilisateur } from "@/lib/server-actions/gestion-comptes";
import {
  modifierFonctionNiveauSchema,
  type ModifierFonctionNiveauInput,
} from "@/types/validations/utilisateur";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FonctionNiveauFormProps {
  utilisateurId: string;
  fonctionActuelleId: string;
  niveauActuel: ModifierFonctionNiveauInput["nouveauNiveau"];
  fonctions: { id: string; nom: string }[];
}

const NIVEAUX: { valeur: ModifierFonctionNiveauInput["nouveauNiveau"]; label: string }[] = [
  { valeur: "DIRECTEUR", label: "Directeur" },
  { valeur: "CHEF_SERVICE", label: "Chef de service" },
  { valeur: "AGENT", label: "Agent" },
];

export function FonctionNiveauForm({
  utilisateurId,
  fonctionActuelleId,
  niveauActuel,
  fonctions,
}: FonctionNiveauFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState<{ nombreExceptions: number } | null>(null);

  const { register, handleSubmit, getValues } = useForm<ModifierFonctionNiveauInput>({
    resolver: zodResolver(modifierFonctionNiveauSchema),
    defaultValues: { nouvelleFonctionId: fonctionActuelleId, nouveauNiveau: niveauActuel },
  });

  async function envoyer(values: ModifierFonctionNiveauInput, confirmer: boolean) {
    setErreur(null);
    setEnCours(true);

    const resultat = await modifierFonctionEtNiveauUtilisateur({
      utilisateurId,
      nouvelleFonctionId: values.nouvelleFonctionId,
      nouveauNiveau: values.nouveauNiveau,
      confirmerEcrasementExceptions: confirmer,
    });

    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    if ("confirmationRequise" in resultat) {
      setConfirmation({ nombreExceptions: resultat.nombreExceptions });
      return;
    }

    setConfirmation(null);
    notifier.succes("Fonction et niveau mis à jour");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit((values) => envoyer(values, false))} className="flex flex-col gap-4">
        <FormField label="Niveau hiérarchique" htmlFor="nouveauNiveau">
          <NativeSelect id="nouveauNiveau" {...register("nouveauNiveau")}>
            {NIVEAUX.map((n) => (
              <option key={n.valeur} value={n.valeur}>
                {n.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <FormField label="Fonction" htmlFor="nouvelleFonctionId">
          <NativeSelect id="nouvelleFonctionId" {...register("nouvelleFonctionId")}>
            {fonctions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

        <Button type="submit" disabled={enCours} className="self-start">
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>

      <Dialog open={confirmation !== null} onOpenChange={(o) => !o && setConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Écraser les accès personnalisés ?</DialogTitle>
            <DialogDescription>
              Cette personne a {confirmation?.nombreExceptions} accès personnalisé
              {(confirmation?.nombreExceptions ?? 0) > 1 ? "s" : ""} qui{" "}
              {(confirmation?.nombreExceptions ?? 0) > 1 ? "seront" : "sera"} perdu
              {(confirmation?.nombreExceptions ?? 0) > 1 ? "s" : ""} — ses accès seront
              entièrement réinitialisés depuis les modules par défaut de la nouvelle fonction.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(null)} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={() => envoyer(getValues(), true)} disabled={enCours}>
              {enCours ? "..." : "Confirmer et écraser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
