"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refuserDemandeMateriel, validerDemandeMateriel } from "@/lib/server-actions/demande-materiel";
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

interface DemandeMaterielActionsProps {
  demandeId: string;
}

/**
 * Jamais atteignable en pratique tant que le Lot 6 n'aura pas donné accès
 * à logistique/magasins à une Fonction — construite pour la complétude du
 * circuit, cf. CLAUDE.md.
 */
export function DemandeMaterielActions({ demandeId }: DemandeMaterielActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogRefus, setDialogRefus] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setEnCours(true);
    const resultat = await validerDemandeMateriel(demandeId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec de la validation", resultat.erreur);
      return;
    }
    notifier.succes("Demande validée");
    router.refresh();
  }

  async function confirmerRefus() {
    setErreur(null);
    setEnCours(true);
    const resultat = await refuserDemandeMateriel(demandeId, motif);
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogRefus(false);
    setMotif("");
    notifier.succes("Demande refusée");
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
            <Input id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
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
