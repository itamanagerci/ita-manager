"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerSortieDefinitive } from "@/lib/server-actions/vehicules";
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

interface SortieDefinitiveFormProps {
  vehiculeId: string;
}

export function SortieDefinitiveForm({ vehiculeId }: SortieDefinitiveFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [valeurResiduelle, setValeurResiduelle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await enregistrerSortieDefinitive({
      vehiculeId,
      motifSortieDefinitive: motif,
      valeurResiduelle: valeurResiduelle ? Number(valeurResiduelle) : undefined,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("Sortie définitive enregistrée");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setDialogOuvert(true)}>
        Sortie définitive
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sortie définitive (cession/réforme)</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Motif" htmlFor="motif">
              <Input id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
            </FormField>
            <FormField label="Valeur résiduelle" htmlFor="valeurResiduelle" helperText="Optionnel">
              <Input
                id="valeurResiduelle"
                type="number"
                min={0}
                value={valeurResiduelle}
                onChange={(e) => setValeurResiduelle(e.target.value)}
              />
            </FormField>

            {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmer} disabled={enCours}>
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
