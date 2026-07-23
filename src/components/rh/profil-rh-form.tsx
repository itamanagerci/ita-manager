"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mettreAJourProfilRH } from "@/lib/server-actions/rh-profils";
import { profilRHSchema, type ProfilRHInput } from "@/types/validations/rh";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";

interface ProfilRHFormProps {
  utilisateurId: string;
  profilExistant: {
    typeProfil: ProfilRHInput["typeProfil"];
    poste: string;
    service: string;
    dateEntree: Date;
    soldeConges: number;
    salaireFixe: number | null;
    entrepriseRattachee: string | null;
    tauxJournalier: number | null;
  } | null;
  superieurActuelId: string | null;
  numeroWaveActuel: string | null;
  utilisateursDisponibles: { id: string; nom: string; prenom: string }[];
}

const TYPES_PROFIL: { valeur: ProfilRHInput["typeProfil"]; label: string }[] = [
  { valeur: "AGENT", label: "Agent" },
  { valeur: "SOUS_TRAITANT", label: "Sous-traitant" },
  { valeur: "OUVRIER", label: "Ouvrier" },
];

export function ProfilRHForm({
  utilisateurId,
  profilExistant,
  superieurActuelId,
  numeroWaveActuel,
  utilisateursDisponibles,
}: ProfilRHFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfilRHInput>({
    resolver: zodResolver(profilRHSchema),
    defaultValues: {
      typeProfil: profilExistant?.typeProfil ?? "AGENT",
      poste: profilExistant?.poste ?? "",
      service: profilExistant?.service ?? "",
      dateEntree: profilExistant?.dateEntree
        ? profilExistant.dateEntree.toISOString().slice(0, 10)
        : "",
      soldeConges: profilExistant?.soldeConges ?? 0,
      superieurId: superieurActuelId ?? "",
      numeroWave: numeroWaveActuel ?? "",
      salaireFixe: profilExistant?.salaireFixe ?? undefined,
      entrepriseRattachee: profilExistant?.entrepriseRattachee ?? "",
      tauxJournalier: profilExistant?.tauxJournalier ?? undefined,
    },
  });

  const typeProfil = watch("typeProfil");

  async function onSubmit(values: ProfilRHInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await mettreAJourProfilRH(utilisateurId, values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes("Profil RH mis à jour");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type de profil" htmlFor="typeProfil">
          <NativeSelect id="typeProfil" {...register("typeProfil")}>
            {TYPES_PROFIL.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          label="Supérieur hiérarchique"
          htmlFor="superieurId"
          helperText="Requis pour soumettre des congés"
        >
          <NativeSelect id="superieurId" {...register("superieurId")}>
            <option value="">Aucun</option>
            {utilisateursDisponibles
              .filter((u) => u.id !== utilisateurId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
          </NativeSelect>
        </FormField>
      </div>

      <FormField
        label="Numéro Wave"
        htmlFor="numeroWave"
        error={errors.numeroWave?.message}
        helperText="Requis pour être bénéficiaire d'un paiement mobile money (DFC)"
      >
        <Input id="numeroWave" {...register("numeroWave")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Poste" htmlFor="poste" error={errors.poste?.message}>
          <Input id="poste" {...register("poste")} />
        </FormField>
        <FormField label="Service" htmlFor="service" error={errors.service?.message}>
          <Input id="service" {...register("service")} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date d'entrée" htmlFor="dateEntree" error={errors.dateEntree?.message}>
          <Input id="dateEntree" type="date" {...register("dateEntree")} />
        </FormField>
        <FormField
          label="Solde de congés (jours)"
          htmlFor="soldeConges"
          error={errors.soldeConges?.message}
        >
          <Input
            id="soldeConges"
            type="number"
            min={0}
            {...register("soldeConges", { valueAsNumber: true })}
          />
        </FormField>
      </div>

      {typeProfil === "AGENT" && (
        <FormField
          label="Salaire fixe"
          htmlFor="salaireFixe"
          error={errors.salaireFixe?.message}
        >
          <Input
            id="salaireFixe"
            type="number"
            min={0}
            {...register("salaireFixe", { valueAsNumber: true })}
          />
        </FormField>
      )}
      {typeProfil === "SOUS_TRAITANT" && (
        <FormField
          label="Entreprise rattachée"
          htmlFor="entrepriseRattachee"
          error={errors.entrepriseRattachee?.message}
        >
          <Input id="entrepriseRattachee" {...register("entrepriseRattachee")} />
        </FormField>
      )}
      {typeProfil === "OUVRIER" && (
        <FormField
          label="Taux journalier"
          htmlFor="tauxJournalier"
          error={errors.tauxJournalier?.message}
        >
          <Input
            id="tauxJournalier"
            type="number"
            min={0}
            {...register("tauxJournalier", { valueAsNumber: true })}
          />
        </FormField>
      )}

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
