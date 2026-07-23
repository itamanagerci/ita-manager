"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloturerNonConformite } from "@/lib/server-actions/qhse-non-conformite";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

interface ClotureNonConformiteActionsProps {
  nonConformiteId: string;
}

export function ClotureNonConformiteActions({ nonConformiteId }: ClotureNonConformiteActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [decision, setDecision] = useState<"ACCEPTEE" | "REFUSEE" | "A_CONFIRMER_PROCHAINE_VERIFICATION">(
    "ACCEPTEE",
  );
  const [enCours, setEnCours] = useState(false);

  async function cloturer() {
    setEnCours(true);
    const resultat = await cloturerNonConformite({ nonConformiteId, decisionCloture: decision });
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec de la clôture", resultat.erreur);
      return;
    }
    notifier.succes("Non-conformité clôturée");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        value={decision}
        onChange={(e) => setDecision(e.target.value as typeof decision)}
        className="w-64"
      >
        <option value="ACCEPTEE">Acceptée</option>
        <option value="REFUSEE">Refusée</option>
        <option value="A_CONFIRMER_PROCHAINE_VERIFICATION">À confirmer lors de la prochaine vérification</option>
      </NativeSelect>
      <Button size="sm" onClick={cloturer} disabled={enCours}>
        {enCours ? "..." : "Clôturer"}
      </Button>
    </div>
  );
}
