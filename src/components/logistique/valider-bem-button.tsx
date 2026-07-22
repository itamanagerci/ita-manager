"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validerBonEntreeMagasin } from "@/lib/server-actions/flux-entree";
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

type Conformite = "CONFORME" | "NON_CONFORME_AVEC_RESERVES";
type ActionEcart = "RETOUR_FOURNISSEUR" | "AVOIR_A_RECEVOIR" | "REGULARISATION_ADMIN" | "ACCEPTE_AVEC_RESERVE";

interface ValiderBEMButtonProps {
  bemId: string;
}

export function ValiderBEMButton({ bemId }: ValiderBEMButtonProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [conformite, setConformite] = useState<Conformite>("CONFORME");
  const [reserves, setReserves] = useState("");
  const [actionEcart, setActionEcart] = useState<ActionEcart>("RETOUR_FOURNISSEUR");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await validerBonEntreeMagasin({
      bemId,
      conformite,
      reserves: conformite === "NON_CONFORME_AVEC_RESERVES" ? reserves : undefined,
      actionEcart: conformite === "NON_CONFORME_AVEC_RESERVES" ? actionEcart : undefined,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("Bon d'entrée validé", "Le stock a été mis à jour.");
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setErreur(null);
          setConformite("CONFORME");
          setReserves("");
          setDialogOuvert(true);
        }}
      >
        Valider
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation du bon d&apos;entrée</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Conformité" htmlFor="conformite">
              <NativeSelect
                id="conformite"
                value={conformite}
                onChange={(e) => setConformite(e.target.value as Conformite)}
              >
                <option value="CONFORME">Conforme au bon de commande</option>
                <option value="NON_CONFORME_AVEC_RESERVES">Non conforme — avec réserves</option>
              </NativeSelect>
            </FormField>

            {conformite === "NON_CONFORME_AVEC_RESERVES" && (
              <>
                <FormField label="Réserves" htmlFor="reserves">
                  <Input id="reserves" value={reserves} onChange={(e) => setReserves(e.target.value)} />
                </FormField>
                <FormField label="Action si écart" htmlFor="actionEcart">
                  <NativeSelect
                    id="actionEcart"
                    value={actionEcart}
                    onChange={(e) => setActionEcart(e.target.value as ActionEcart)}
                  >
                    <option value="RETOUR_FOURNISSEUR">Retour fournisseur</option>
                    <option value="AVOIR_A_RECEVOIR">Avoir à recevoir</option>
                    <option value="REGULARISATION_ADMIN">Régularisation admin</option>
                    <option value="ACCEPTE_AVEC_RESERVE">Accepté avec réserve</option>
                  </NativeSelect>
                </FormField>
              </>
            )}

            {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmer} disabled={enCours}>
              {enCours ? "..." : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
