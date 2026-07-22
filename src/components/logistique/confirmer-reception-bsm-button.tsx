"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmerReceptionBSM } from "@/lib/server-actions/flux-sortie";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface ConfirmerReceptionBSMButtonProps {
  bsmId: string;
}

export function ConfirmerReceptionBSMButton({ bsmId }: ConfirmerReceptionBSMButtonProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    setEnCours(true);
    const resultat = await confirmerReceptionBSM(bsmId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec de la confirmation", resultat.erreur);
      return;
    }
    notifier.succes("Réception confirmée");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={confirmer} disabled={enCours}>
      {enCours ? "..." : "Confirmer la réception"}
    </Button>
  );
}
