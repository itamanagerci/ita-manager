"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerComptageLigne } from "@/lib/server-actions/inventaire-periodique";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LigneComptageFormProps {
  sessionId: string;
  materielId: string;
  quantitePhysiqueInitiale: number;
  commentaireInitial?: string | null;
  disabled?: boolean;
}

export function LigneComptageForm({
  sessionId,
  materielId,
  quantitePhysiqueInitiale,
  commentaireInitial,
  disabled,
}: LigneComptageFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [quantitePhysique, setQuantitePhysique] = useState(quantitePhysiqueInitiale);
  const [commentaire, setCommentaire] = useState(commentaireInitial ?? "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer() {
    setEnCours(true);
    const resultat = await enregistrerComptageLigne({
      sessionId,
      materielId,
      quantitePhysique,
      commentaire,
    });
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec de l'enregistrement", resultat.erreur);
      return;
    }
    notifier.succes("Comptage enregistré");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        className="w-24"
        value={quantitePhysique}
        onChange={(e) => setQuantitePhysique(Number(e.target.value))}
        disabled={disabled}
      />
      <Input
        placeholder="Commentaire"
        className="w-40"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        disabled={disabled}
      />
      <Button size="sm" variant="outline" onClick={enregistrer} disabled={disabled || enCours}>
        {enCours ? "..." : "Enregistrer"}
      </Button>
    </div>
  );
}
