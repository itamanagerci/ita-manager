"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refuserParallele, validerParallele } from "@/lib/server-actions/achat-validations";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ValidationParalleleActionsProps {
  validationId: string;
}

export function ValidationParalleleActions({ validationId }: ValidationParalleleActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogRefus, setDialogRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setEnCours(true);
    const resultat = await validerParallele(validationId);
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec de la validation", resultat.erreur);
      return;
    }
    notifier.succes("Validation enregistrée");
    router.refresh();
  }

  async function confirmerRefus() {
    setErreur(null);
    setEnCours(true);
    const resultat = await refuserParallele(validationId, motif);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogRefus(false);
    setMotif("");
    notifier.succes("Demande refusée", "La demande retourne au Responsable Achat pour correction.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={valider} disabled={enCours}>
        Valider
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setErreur(null);
          setMotif("");
          setDialogRefus(true);
        }}
        disabled={enCours}
      >
        Refuser
      </Button>

      <Dialog open={dialogRefus} onOpenChange={setDialogRefus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser cette demande</DialogTitle>
          </DialogHeader>
          <FormField label="Motif" htmlFor="motif" error={erreur ?? undefined}>
            <Input
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif du refus"
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRefus(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmerRefus} disabled={enCours}>
              {enCours ? "..." : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
