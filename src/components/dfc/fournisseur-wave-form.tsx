"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mettreAJourNumeroWaveFournisseur } from "@/lib/server-actions/dfc-fournisseurs";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FournisseurWaveFormProps {
  fournisseurId: string;
  numeroWaveInitial: string | null;
}

export function FournisseurWaveForm({ fournisseurId, numeroWaveInitial }: FournisseurWaveFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [numeroWave, setNumeroWave] = useState(numeroWaveInitial ?? "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer() {
    setEnCours(true);
    const resultat = await mettreAJourNumeroWaveFournisseur({ fournisseurId, numeroWave });
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes("Numéro Wave mis à jour");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={numeroWave}
        onChange={(e) => setNumeroWave(e.target.value)}
        placeholder="Numéro Wave"
        className="w-40"
      />
      <Button size="sm" variant="outline" onClick={enregistrer} disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </Button>
    </div>
  );
}
