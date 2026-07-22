"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategorieDocument } from "@prisma/client";
import { ajouterDocument } from "@/lib/server-actions/documents";
import { LABEL_CATEGORIE } from "@/lib/categories-document";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AjouterDocumentFormProps {
  categoriesAutorisees: CategorieDocument[];
}

export function AjouterDocumentForm({ categoriesAutorisees }: AjouterDocumentFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const formData = new FormData(event.currentTarget);
    const resultat = await ajouterDocument(formData);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    formRef.current?.reset();
    notifier.succes("Document archivé", "Le document est maintenant disponible dans la liste.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Ajouter un document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Titre" htmlFor="titre">
            <Input id="titre" name="titre" required />
          </FormField>

          <FormField label="Catégorie" htmlFor="categorie">
            <NativeSelect id="categorie" name="categorie" defaultValue={categoriesAutorisees[0]}>
              {categoriesAutorisees.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {LABEL_CATEGORIE[categorie]}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Fichier"
            htmlFor="fichier"
            helperText="PDF, image, Word ou Excel — 20 Mo maximum."
          >
            <Input
              id="fichier"
              name="fichier"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Ajouter le document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
