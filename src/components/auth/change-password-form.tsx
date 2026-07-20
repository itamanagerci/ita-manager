"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/types/validations/auth";
import { changerMotDePassePremiereConnexion } from "@/app/(auth)/premiere-connexion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
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

    if (resultat?.erreur) {
      setErreur(resultat.erreur);
      setEnCours(false);
    }
    // Succès : la Server Action redirige elle-même vers /dashboard.
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nouveauMotDePasse">Nouveau code d&apos;accès</Label>
        <Input
          id="nouveauMotDePasse"
          type="password"
          autoComplete="new-password"
          {...register("nouveauMotDePasse")}
        />
        {errors.nouveauMotDePasse && (
          <p className="text-sm text-status-danger">
            {errors.nouveauMotDePasse.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmationMotDePasse">Confirmation</Label>
        <Input
          id="confirmationMotDePasse"
          type="password"
          autoComplete="new-password"
          {...register("confirmationMotDePasse")}
        />
        {errors.confirmationMotDePasse && (
          <p className="text-sm text-status-danger">
            {errors.confirmationMotDePasse.message}
          </p>
        )}
      </div>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Enregistrement..." : "Valider mon nouveau code d'accès"}
      </Button>
    </form>
  );
}
