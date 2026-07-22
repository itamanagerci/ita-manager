"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/types/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/composed/form-field";

export function LoginForm() {
  const router = useRouter();
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setErreurConnexion(null);
    setEnCours(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.motDePasse,
    });

    if (error) {
      setErreurConnexion("Email ou mot de passe incorrect.");
      setEnCours(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" {...register("email")} />
      </FormField>

      <FormField
        label="Code d'accès"
        htmlFor="motDePasse"
        error={errors.motDePasse?.message}
      >
        <Input
          id="motDePasse"
          type="password"
          autoComplete="current-password"
          {...register("motDePasse")}
        />
      </FormField>

      {erreurConnexion && (
        <p className="text-sm text-status-danger">{erreurConnexion}</p>
      )}

      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
