"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { executerPaiementUrgent } from "@/lib/server-actions/dfc-paiement-urgent";
import {
  executerPaiementUrgentSchema,
  type ExecuterPaiementUrgentInput,
} from "@/types/validations/dfc";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/composed/form-field";

interface ExecutionPaiementUrgentFormProps {
  code: string;
  utilisateurs: { id: string; nom: string; prenom: string; numeroWave: string | null }[];
  fournisseurs: { id: string; nom: string; numeroWave: string | null }[];
}

type TypeBeneficiaire = "UTILISATEUR" | "FOURNISSEUR";

export function ExecutionPaiementUrgentForm({
  code,
  utilisateurs,
  fournisseurs,
}: ExecutionPaiementUrgentFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<TypeBeneficiaire>("UTILISATEUR");
  const [confirme, setConfirme] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExecuterPaiementUrgentInput>({
    resolver: zodResolver(executerPaiementUrgentSchema),
    defaultValues: { codeSaisi: code, beneficiaireUtilisateurId: "", beneficiaireFournisseurId: "" },
  });

  const beneficiaireUtilisateurId = watch("beneficiaireUtilisateurId");
  const beneficiaireFournisseurId = watch("beneficiaireFournisseurId");
  const montant = watch("montant");

  const nomBeneficiaire = useMemo(() => {
    if (typeBeneficiaire === "UTILISATEUR") {
      const u = utilisateurs.find((x) => x.id === beneficiaireUtilisateurId);
      return u ? `${u.prenom} ${u.nom}` : "—";
    }
    const f = fournisseurs.find((x) => x.id === beneficiaireFournisseurId);
    return f?.nom ?? "—";
  }, [typeBeneficiaire, beneficiaireUtilisateurId, beneficiaireFournisseurId, utilisateurs, fournisseurs]);

  async function onSubmit(values: ExecuterPaiementUrgentInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await executerPaiementUrgent(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes("Paiement exécuté", "Ce paiement est terminal — aucune modification possible.");
    router.refresh();
  }

  function changerType(nouveauType: TypeBeneficiaire) {
    setTypeBeneficiaire(nouveauType);
    if (nouveauType === "UTILISATEUR") {
      setValue("beneficiaireFournisseurId", "");
    } else {
      setValue("beneficiaireUtilisateurId", "");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register("codeSaisi")} />

      <FormField label="Type de bénéficiaire" htmlFor="typeBeneficiaire">
        <NativeSelect
          id="typeBeneficiaire"
          value={typeBeneficiaire}
          onChange={(e) => changerType(e.target.value as TypeBeneficiaire)}
        >
          <option value="UTILISATEUR">Employé / ouvrier / sous-traitant</option>
          <option value="FOURNISSEUR">Fournisseur</option>
        </NativeSelect>
      </FormField>

      {typeBeneficiaire === "UTILISATEUR" ? (
        <FormField
          label="Bénéficiaire"
          htmlFor="beneficiaireUtilisateurId"
          error={errors.beneficiaireUtilisateurId?.message}
        >
          <NativeSelect id="beneficiaireUtilisateurId" {...register("beneficiaireUtilisateurId")}>
            <option value="">Sélectionner...</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom}
                {!u.numeroWave ? " (pas de numéro Wave)" : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : (
        <FormField label="Bénéficiaire" htmlFor="beneficiaireFournisseurId">
          <NativeSelect id="beneficiaireFournisseurId" {...register("beneficiaireFournisseurId")}>
            <option value="">Sélectionner...</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
                {!f.numeroWave ? " (pas de numéro Wave)" : ""}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      )}

      <FormField label="Montant (F CFA)" htmlFor="montant" error={errors.montant?.message}>
        <Input id="montant" type="number" min={0} {...register("montant", { valueAsNumber: true })} />
      </FormField>

      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p className="font-semibold">Récapitulatif</p>
        <p>Montant : {montant ? Number(montant).toLocaleString("fr-FR") : "—"} F CFA</p>
        <p>Bénéficiaire : {nomBeneficiaire}</p>
        <p>Code d&apos;autorisation : {code}</p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={confirme} onCheckedChange={(v) => setConfirme(v === true)} className="mt-0.5" />
        Je confirme avoir vérifié le montant, le bénéficiaire et le code ci-dessus, et j&apos;autorise
        l&apos;exécution de ce paiement — cette action est irréversible.
      </label>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours || !confirme} className="self-start">
        {enCours ? "Exécution..." : "Exécuter le paiement"}
      </Button>
    </form>
  );
}
