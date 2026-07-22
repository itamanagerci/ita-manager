"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifierStockDMS } from "@/lib/server-actions/flux-sortie";
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

interface VerificationDMSActionsProps {
  demandeId: string;
}

export function VerificationDMSActions({ demandeId }: VerificationDMSActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [statut, setStatut] = useState<"DISPONIBLE" | "RUPTURE_PARTIELLE" | "RUPTURE_TOTALE">("DISPONIBLE");
  const [observations, setObservations] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await verifierStockDMS({
      demandeId,
      verificationStatut: statut,
      verificationObservations: observations,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("Vérification enregistrée", "Transmise au Logisticien pour décision.");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setDialogOuvert(true)}>
        Vérifier le stock
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vérification du stock</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Disponibilité" htmlFor="verificationStatut">
              <NativeSelect
                id="verificationStatut"
                value={statut}
                onChange={(e) => setStatut(e.target.value as typeof statut)}
              >
                <option value="DISPONIBLE">Disponible(s)</option>
                <option value="RUPTURE_PARTIELLE">Non — rupture partielle</option>
                <option value="RUPTURE_TOTALE">Non — rupture totale</option>
              </NativeSelect>
            </FormField>
            <FormField label="Observations" htmlFor="verificationObservations" helperText="Optionnel">
              <Input
                id="verificationObservations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
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
