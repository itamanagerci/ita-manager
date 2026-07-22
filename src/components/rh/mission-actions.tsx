"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refuserMission, validerMission } from "@/lib/server-actions/rh-missions";
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

interface MissionActionsProps {
  demandeId: string;
}

export function MissionActions({ demandeId }: MissionActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogRefus, setDialogRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setEnCours(true);
    const resultat = await validerMission(demandeId);
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec de la validation", resultat.erreur);
      return;
    }
    notifier.succes("Mission validée");
    router.refresh();
  }

  async function confirmerRefus() {
    setErreur(null);
    setEnCours(true);
    const resultat = await refuserMission(demandeId, motif);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogRefus(false);
    setMotif("");
    notifier.succes("Mission refusée");
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
            <DialogTitle>Refuser cette mission</DialogTitle>
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
