"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerCompteUtilisateur } from "@/lib/server-actions/gestion-comptes";
import { creerCompteSchema, type CreerCompteInput } from "@/types/validations/utilisateur";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreerCompteFormProps {
  fonctions: { id: string; nom: string }[];
}

const NIVEAUX: { valeur: CreerCompteInput["niveauHierarchique"]; label: string }[] = [
  { valeur: "DIRECTEUR", label: "Directeur" },
  { valeur: "CHEF_SERVICE", label: "Chef de service" },
  { valeur: "AGENT", label: "Agent" },
];

export function CreerCompteForm({ fonctions }: CreerCompteFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [compteCree, setCompteCree] = useState<
    { email: string; motDePasse: string; emailEnvoye: boolean } | null
  >(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerCompteInput>({
    resolver: zodResolver(creerCompteSchema),
    defaultValues: { fonctionId: fonctions[0]?.id ?? "", niveauHierarchique: "AGENT" },
  });

  async function onSubmit(values: CreerCompteInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerCompteUtilisateur(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    setCompteCree({
      email: resultat.email,
      motDePasse: resultat.motDePasseTemporaire,
      emailEnvoye: resultat.emailEnvoye,
    });
    notifier.succes(
      "Compte créé",
      resultat.emailEnvoye
        ? `${resultat.email} peut maintenant se connecter — un email avec le mot de passe temporaire lui a été envoyé.`
        : `${resultat.email} peut maintenant se connecter — l'email n'a pas pu être envoyé, communiquez le mot de passe manuellement.`,
    );
    router.refresh();
  }

  return (
    <>
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogTrigger asChild>
          <Button>Créer un compte</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Créer un compte</DialogTitle>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Un mot de passe temporaire sera généré et envoyé par email à la personne
            concernée — vous pourrez aussi le consulter ici une fois le compte créé.
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Identité
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Prénom" htmlFor="prenom" error={errors.prenom?.message}>
                  <Input id="prenom" {...register("prenom")} />
                </FormField>
                <FormField label="Nom" htmlFor="nom" error={errors.nom?.message}>
                  <Input id="nom" {...register("nom")} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                  <Input id="email" type="email" {...register("email")} />
                </FormField>
                <FormField label="Téléphone" htmlFor="telephone" helperText="Optionnel">
                  <Input id="telephone" {...register("telephone")} />
                </FormField>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Rôle
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Niveau hiérarchique" htmlFor="niveauHierarchique">
                  <NativeSelect id="niveauHierarchique" {...register("niveauHierarchique")}>
                    {NIVEAUX.map((n) => (
                      <option key={n.valeur} value={n.valeur}>
                        {n.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField
                  label="Fonction"
                  htmlFor="fonctionId"
                  error={errors.fonctionId?.message}
                >
                  <NativeSelect id="fonctionId" {...register("fonctionId")}>
                    {fonctions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              </div>
            </div>

            {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

            <DialogFooter>
              <Button type="submit" disabled={enCours}>
                {enCours ? "Création..." : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={compteCree !== null} onOpenChange={(ouvert) => !ouvert && setCompteCree(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compte créé</DialogTitle>
            <DialogDescription>
              {compteCree?.emailEnvoye
                ? `Un email avec ce mot de passe temporaire a été envoyé à ${compteCree?.email}. Il ne sera plus affiché ensuite.`
                : `L'email n'a pas pu être envoyé — ce mot de passe temporaire ne sera plus affiché ensuite, communiquez-le à ${compteCree?.email} hors de cette application.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{compteCree?.email}</p>
            <p className="mt-3 text-xs text-muted-foreground">Mot de passe temporaire</p>
            <p className="font-mono text-lg font-medium">{compteCree?.motDePasse}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCompteCree(null)}>J&apos;ai noté le mot de passe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
