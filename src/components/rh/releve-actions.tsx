"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validerReleveActivite } from "@/lib/server-actions/rh-releves";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface ReleveActionsProps {
  releveId: string;
}

export function ReleveActions({ releveId }: ReleveActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setEnCours(true);
    const resultat = await validerReleveActivite(releveId);
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec de la validation", resultat.erreur);
      return;
    }
    notifier.succes("Relevé validé");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={valider} disabled={enCours}>
      Valider
    </Button>
  );
}
