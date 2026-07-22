"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloturerSessionInventaire } from "@/lib/server-actions/inventaire-periodique";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface CloturerSessionButtonProps {
  sessionId: string;
}

export function CloturerSessionButton({ sessionId }: CloturerSessionButtonProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function cloturer() {
    setEnCours(true);
    const resultat = await cloturerSessionInventaire(sessionId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec de la clôture", resultat.erreur);
      return;
    }
    notifier.succes("Session clôturée", "Les écarts ont été appliqués au stock.");
    router.refresh();
  }

  return (
    <Button onClick={cloturer} disabled={enCours}>
      {enCours ? "Clôture..." : "Clôturer la session"}
    </Button>
  );
}
