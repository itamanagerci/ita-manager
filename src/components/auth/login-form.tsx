"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/types/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="username" {...register("email")} />
        {errors.email && (
          <p className="text-sm text-status-danger">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="motDePasse">Code d&apos;accès</Label>
        <Input
          id="motDePasse"
          type="password"
          autoComplete="current-password"
          {...register("motDePasse")}
        />
        {errors.motDePasse && (
          <p className="text-sm text-status-danger">{errors.motDePasse.message}</p>
        )}
      </div>

      {erreurConnexion && (
        <p className="text-sm text-status-danger">{erreurConnexion}</p>
      )}

      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
