"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { viserLogistiqueEtAffecter, refuserDemandeTransport } from "@/lib/server-actions/demande-transport";
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

interface VisaLogistiqueActionsProps {
  demandeId: string;
  vehicules: { id: string; immatriculation: string }[];
}

export function VisaLogistiqueActions({ demandeId, vehicules }: VisaLogistiqueActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogVisa, setDialogVisa] = useState(false);
  const [dialogRefus, setDialogRefus] = useState(false);
  const [vehiculeId, setVehiculeId] = useState(vehicules[0]?.id ?? "");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmerVisa() {
    setErreur(null);
    setEnCours(true);
    const resultat = await viserLogistiqueEtAffecter({ demandeId, vehiculeId });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogVisa(false);
    notifier.succes("Visa Logistique enregistré", "Véhicule affecté.");
    router.refresh();
  }

  async function confirmerRefus() {
    setErreur(null);
    setEnCours(true);
    const resultat = await refuserDemandeTransport(demandeId, motif);
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogRefus(false);
    notifier.succes("Demande refusée");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setDialogVisa(true)}>
        Viser et affecter
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDialogRefus(true)}>
        Refuser
      </Button>

      <Dialog open={dialogVisa} onOpenChange={setDialogVisa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visa Logistique et affectation</DialogTitle>
          </DialogHeader>
          <FormField label="Véhicule/engin" htmlFor="vehiculeId">
            <NativeSelect id="vehiculeId" value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)}>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.immatriculation}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisa(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmerVisa} disabled={enCours}>
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
