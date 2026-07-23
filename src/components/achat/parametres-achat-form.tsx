"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mettreAJourSeuilUrgence } from "@/lib/server-actions/achat-parametres";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

interface ParametresAchatFormProps {
  seuilUrgenceInitial: number;
}

export function ParametresAchatForm({ seuilUrgenceInitial }: ParametresAchatFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [seuil, setSeuil] = useState(seuilUrgenceInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await mettreAJourSeuilUrgence({ seuilUrgence: seuil });
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    notifier.succes("Seuil d'urgence mis à jour");
    router.refresh();
  }

  return (
    <div className="flex items-end gap-3">
      <FormField label="Seuil d'urgence (F CFA TTC)" htmlFor="seuilUrgence" error={erreur ?? undefined}>
        <Input
          id="seuilUrgence"
          type="number"
          min={0}
          value={seuil}
          onChange={(e) => setSeuil(Number(e.target.value))}
          className="w-48"
        />
      </FormField>
      <Button size="sm" variant="outline" onClick={enregistrer} disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </Button>
    </div>
  );
}
