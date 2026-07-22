"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/types/validations/auth";
import { changerMotDePassePremiereConnexion } from "@/app/(auth)/premiere-connexion/actions";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

export function ChangePasswordForm() {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await changerMotDePassePremiereConnexion(values.nouveauMotDePasse);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      setEnCours(false);
      return;
    }

    notifier.succes(
      "Mot de passe mis à jour",
      "Vous allez être redirigé vers votre tableau de bord.",
    );
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Nouveau code d'accès"
        htmlFor="nouveauMotDePasse"
        error={errors.nouveauMotDePasse?.message}
      >
        <Input
          id="nouveauMotDePasse"
          type="password"
          autoComplete="new-password"
          {...register("nouveauMotDePasse")}
        />
      </FormField>

      <FormField
        label="Confirmation"
        htmlFor="confirmationMotDePasse"
        error={errors.confirmationMotDePasse?.message}
      >
        <Input
          id="confirmationMotDePasse"
          type="password"
          autoComplete="new-password"
          {...register("confirmationMotDePasse")}
        />
      </FormField>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Enregistrement..." : "Valider mon nouveau code d'accès"}
      </Button>
    </form>
  );
}
