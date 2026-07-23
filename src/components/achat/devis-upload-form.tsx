"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ajouterPieceJointeDevis } from "@/lib/server-actions/achat-traitement";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

interface DevisUploadFormProps {
  demandeId: string;
}

export function DevisUploadForm({ demandeId }: DevisUploadFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const formRef = useRef<HTMLFormElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const formData = new FormData(event.currentTarget);
    const resultat = await ajouterPieceJointeDevis(demandeId, formData);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    formRef.current?.reset();
    notifier.succes("Devis ajouté");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormField
        label="Joindre un devis"
        htmlFor="devis"
        helperText="PDF, image, Word ou Excel — 20 Mo maximum par fichier, plusieurs fichiers possibles."
      >
        <Input
          id="devis"
          name="devis"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        />
      </FormField>
      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
      <Button type="submit" size="sm" disabled={enCours} className="self-start">
        {enCours ? "Envoi..." : "Ajouter"}
      </Button>
    </form>
  );
}
