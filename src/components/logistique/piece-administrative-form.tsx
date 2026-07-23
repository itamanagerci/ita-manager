"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ajouterPieceAdministrative } from "@/lib/server-actions/pieces-admin-vehicules";
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

interface PieceAdministrativeFormProps {
  vehicules: { id: string; immatriculation: string }[];
  types: { id: string; nom: string }[];
}

export function PieceAdministrativeForm({ vehicules, types }: PieceAdministrativeFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const formData = new FormData(event.currentTarget);
    const resultat = await ajouterPieceAdministrative(formData);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    formRef.current?.reset();
    notifier.succes("Pièce administrative ajoutée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Ajouter une pièce</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une pièce administrative</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Véhicule/engin" htmlFor="vehiculeId">
            <NativeSelect id="vehiculeId" name="vehiculeId" required>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Type de pièce" htmlFor="typePieceId">
            <NativeSelect id="typePieceId" name="typePieceId" required>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date d'émission" htmlFor="dateEmission" helperText="Optionnel">
              <Input id="dateEmission" name="dateEmission" type="date" />
            </FormField>
            <FormField label="Date d'expiration" htmlFor="dateExpiration" helperText="Optionnel">
              <Input id="dateExpiration" name="dateExpiration" type="date" />
            </FormField>
          </div>

          <FormField label="Fichier scanné" htmlFor="fichier" helperText="Optionnel — PDF, image, Word, Excel">
            <Input
              id="fichier"
              name="fichier"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
