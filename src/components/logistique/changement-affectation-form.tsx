"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerChangementAffectation } from "@/lib/server-actions/vehicules";
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

interface ChangementAffectationFormProps {
  vehiculeId: string;
  chantierActuel: string | null;
  chauffeurs: { id: string; nom: string; prenom: string }[];
}

export function ChangementAffectationForm({
  vehiculeId,
  chantierActuel,
  chauffeurs,
}: ChangementAffectationFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [chauffeurActuelId, setChauffeurActuelId] = useState("");
  const [chantier, setChantier] = useState(chantierActuel ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await enregistrerChangementAffectation({
      vehiculeId,
      chauffeurActuelId: chauffeurActuelId || undefined,
      chantierActuel: chantier || undefined,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setDialogOuvert(false);
    notifier.succes("Affectation mise à jour");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setDialogOuvert(true)}>
        Changer l&apos;affectation
      </Button>

      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer l&apos;affectation</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FormField label="Chauffeur" htmlFor="chauffeurActuelId" helperText="Optionnel">
              <NativeSelect
                id="chauffeurActuelId"
                value={chauffeurActuelId}
                onChange={(e) => setChauffeurActuelId(e.target.value)}
              >
                <option value="">Aucun</option>
                {chauffeurs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Chantier" htmlFor="chantier" helperText="Optionnel">
              <Input id="chantier" value={chantier} onChange={(e) => setChantier(e.target.value)} />
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
