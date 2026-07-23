"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { marquerBonDeCommandeEnvoye } from "@/lib/server-actions/achat-bons-commande";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface BonCommandeActionsProps {
  bonDeCommandeId: string;
}

export function BonCommandeActions({ bonDeCommandeId }: BonCommandeActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    setEnCours(true);
    const resultat = await marquerBonDeCommandeEnvoye(bonDeCommandeId);
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes("Bon de Commande marqué envoyé");
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={envoyer} disabled={enCours}>
      {enCours ? "..." : "Marquer envoyé"}
    </Button>
  );
}
