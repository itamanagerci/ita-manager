"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerChangementEtat } from "@/lib/server-actions/vehicules";
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
} from "@/components/ui/dialog";

type Etat = "OK" | "PANNE" | "HORS_SERVICE";

interface ChangementEtatFormProps {
  vehiculeId: string;
  etatActuel: Etat;
}

export function ChangementEtatForm({ vehiculeId, etatActuel }: ChangementEtatFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [etat, setEtat] = useState<Etat>(etatActuel);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await enregistrerChangementEtat({ vehiculeId, etat, commentaire });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("État mis à jour");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setDialogOuvert(true)}>
        Changer l&apos;état
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer l&apos;état</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Nouvel état" htmlFor="etat">
              <NativeSelect id="etat" value={etat} onChange={(e) => setEtat(e.target.value as Etat)}>
                <option value="OK">OK</option>
                <option value="PANNE">Panne</option>
                <option value="HORS_SERVICE">Hors service</option>
              </NativeSelect>
            </FormField>
            <FormField label="Commentaire" htmlFor="commentaire" helperText="Optionnel">
              <Input id="commentaire" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
            </FormField>

            {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmer} disabled={enCours}>
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
