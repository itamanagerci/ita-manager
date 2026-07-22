"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerDemandeAppelOffres } from "@/lib/server-actions/appel-offres";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AppelOffresForm() {
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
    const resultat = await creerDemandeAppelOffres(formData);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    formRef.current?.reset();
    notifier.succes("Appel d'offres soumis", "Transmis à la Direction Générale pour validation.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvel appel d&apos;offres</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvel appel d&apos;offres</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nom" htmlFor="nom">
              <Input id="nom" name="nom" required />
            </FormField>
            <FormField label="Client" htmlFor="client">
              <Input id="client" name="client" required />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Montant estimé" htmlFor="montantEstime">
              <Input id="montantEstime" name="montantEstime" type="number" min={0} required />
            </FormField>
            <FormField label="Délai de réponse" htmlFor="delaiReponse">
              <Input id="delaiReponse" name="delaiReponse" type="date" required />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <Input id="description" name="description" required />
          </FormField>

          <FormField
            label="Pièces jointes"
            htmlFor="pieceJointe"
            helperText="PDF, image, Word ou Excel — 20 Mo maximum par fichier, plusieurs fichiers possibles."
          >
            <Input
              id="pieceJointe"
              name="pieceJointe"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Soumettre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
