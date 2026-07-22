"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cocherPointValidation } from "@/lib/server-actions/gestion-projet";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface PointValidationActionsProps {
  pointId: string;
}

export function PointValidationActions({ pointId }: PointValidationActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function cocher() {
    setEnCours(true);
    const resultat = await cocherPointValidation(pointId);
    setEnCours(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes("Point marqué comme fait");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={cocher} disabled={enCours}>
      Marquer comme fait
    </Button>
  );
}
