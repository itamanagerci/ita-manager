"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

interface PhotoUploadFormProps {
  entityId: string;
  action: (entityId: string, formData: FormData) => Promise<{ erreur: string } | { succes: true }>;
}

/**
 * Réutilise le pattern Storage du Lot 2/7 (bucket privé "documents",
 * MIME_TYPES_AUTORISES/TAILLE_MAX_OCTETS déjà vérifiés côté serveur) —
 * partagé par Inspection HSE, Rapport Incident et Non-Conformité, qui ont
 * chacun leur propre action serveur (préfixe de chemin différent) mais un
 * formulaire identique.
 */
export function PhotoUploadForm({ entityId, action }: PhotoUploadFormProps) {
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
    const resultat = await action(entityId, formData);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    formRef.current?.reset();
    notifier.succes("Photo ajoutée");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormField
        label="Ajouter une photo"
        htmlFor="photo"
        helperText="PDF, image, Word ou Excel — 20 Mo maximum par fichier, plusieurs fichiers possibles."
      >
        <Input
          id="photo"
          name="photo"
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
