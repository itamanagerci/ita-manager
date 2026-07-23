"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demanderCodeAutorisation } from "@/lib/server-actions/dfc-paiement-urgent";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

export function DemandeCodeUrgentForm() {
  const router = useRouter();
  const notifier = useNotifier();
  const [justification, setJustification] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre() {
    setErreur(null);
    setEnCours(true);
    const resultat = await demanderCodeAutorisation({ justification });
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    setJustification("");
    notifier.succes("Demande envoyée", "Transmise à la Direction Générale.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Justification de l'urgence" htmlFor="justification" error={erreur ?? undefined}>
        <Input
          id="justification"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Pourquoi ce paiement doit sortir du circuit standard"
        />
      </FormField>
      <Button onClick={soumettre} disabled={enCours} className="self-start">
        {enCours ? "Envoi..." : "Demander un code d'autorisation"}
      </Button>
    </div>
  );
}
