"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  accepterContreProposition,
  refuserContreProposition,
} from "@/lib/server-actions/demande-rh-projet";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface ContrePropositionActionsProps {
  ligneId: string;
}

export function ContrePropositionActions({ ligneId }: ContrePropositionActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function accepter() {
    setEnCours(true);
    const resultat = await accepterContreProposition(ligneId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes("Contre-proposition acceptée");
    router.refresh();
  }

  async function refuser() {
    setEnCours(true);
    const resultat = await refuserContreProposition(ligneId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes("Contre-proposition refusée");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={accepter} disabled={enCours}>
        Accepter
      </Button>
      <Button size="sm" variant="outline" onClick={refuser} disabled={enCours}>
        Refuser
      </Button>
    </div>
  );
}
