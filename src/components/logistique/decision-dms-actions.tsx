"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deciderDMS } from "@/lib/server-actions/flux-sortie";
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

type Decision = "APPROUVEE" | "TRANSFERT_INTER_MAGASIN" | "DEMANDE_ACHAT_DECLENCHEE" | "REFUSEE";

interface DecisionDMSActionsProps {
  demandeId: string;
  magasinSourceId: string;
  magasins: { id: string; code: string; nom: string }[];
}

export function DecisionDMSActions({ demandeId, magasinSourceId, magasins }: DecisionDMSActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [decision, setDecision] = useState<Decision>("APPROUVEE");
  const [magasinCibleId, setMagasinCibleId] = useState("");
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const magasinsCibles = magasins.filter((m) => m.id !== magasinSourceId);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await deciderDMS({
      demandeId,
      decision,
      motifRefus: decision === "REFUSEE" ? motifRefus : undefined,
      magasinCibleId: decision === "TRANSFERT_INTER_MAGASIN" ? magasinCibleId : undefined,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("Décision enregistrée");
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setErreur(null);
          setDecision("APPROUVEE");
          setMotifRefus("");
          setMagasinCibleId(magasinsCibles[0]?.id ?? "");
          setDialogOuvert(true);
        }}
      >
        Décider
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Décision Logisticien</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Décision" htmlFor="decision">
              <NativeSelect
                id="decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value as Decision)}
              >
                <option value="APPROUVEE">Mise à disposition approuvée</option>
                <option value="TRANSFERT_INTER_MAGASIN">Transfert inter-magasin</option>
                <option value="DEMANDE_ACHAT_DECLENCHEE">
                  Demande d&apos;achat déclenchée (seuil d&apos;alerte)
                </option>
                <option value="REFUSEE">Refusé</option>
              </NativeSelect>
            </FormField>

            {decision === "TRANSFERT_INTER_MAGASIN" && (
              <FormField label="Magasin cible" htmlFor="magasinCibleId">
                <NativeSelect
                  id="magasinCibleId"
                  value={magasinCibleId}
                  onChange={(e) => setMagasinCibleId(e.target.value)}
                >
                  {magasinsCibles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.nom}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}

            {decision === "REFUSEE" && (
              <FormField label="Motif" htmlFor="motifRefus">
                <Input id="motifRefus" value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} />
              </FormField>
            )}

            {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button
              variant={decision === "REFUSEE" ? "destructive" : "default"}
              onClick={confirmer}
              disabled={enCours}
            >
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
