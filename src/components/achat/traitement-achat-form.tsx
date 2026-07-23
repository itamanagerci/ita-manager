"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  traiterDemandeAchat,
  resoumettreApresRefusValidateurs,
} from "@/lib/server-actions/achat-traitement";
import { traiterDemandeAchatSchema, type TraiterDemandeAchatInput } from "@/types/validations/achat";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";

interface LigneDemande {
  id: string;
  quantite: number;
  article: { designation: string } | null;
  designationLibre: string | null;
}

interface TraitementAchatFormProps {
  demandeId: string;
  lignes: LigneDemande[];
  estResoumission: boolean;
}

const ROLES = [
  { value: "DT", label: "Direction Technique" },
  { value: "RH", label: "Ressources Humaines" },
  { value: "DFC", label: "Finances et Comptabilité (DFC)" },
  { value: "DG", label: "Direction Générale" },
] as const;

export function TraitementAchatForm({ demandeId, lignes, estResoumission }: TraitementAchatFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: TraiterDemandeAchatInput = {
    demandeId,
    lignes: lignes.map((ligne) => ({
      ligneId: ligne.id,
      fournisseur: "",
      modeTarification: "CALCULE",
      prixUnitaire: undefined,
      montantForfaitaire: undefined,
    })),
    dateLivraisonPrevue: "",
    tauxTva: 18,
    typePaiement: "VIREMENT",
    echeancePaiementJours: 30,
    urgent: false,
    rolesSelectionnes: [],
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TraiterDemandeAchatInput>({
    resolver: zodResolver(traiterDemandeAchatSchema),
    defaultValues,
  });

  const urgent = watch("urgent");
  const lignesValues = watch("lignes");

  async function onSubmit(values: TraiterDemandeAchatInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = estResoumission
      ? await resoumettreApresRefusValidateurs(values)
      : await traiterDemandeAchat(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes(values.urgent ? "Bon de Commande émis (urgent)" : "Envoyée en validation parallèle");
    router.push("/dashboard/achat/traitement-achat");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Prix et fournisseur par article
        </p>
        {lignes.map((ligne, index) => (
          <div key={ligne.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
            <div className="col-span-3 text-sm font-medium">
              {ligne.article?.designation ?? ligne.designationLibre} — quantité : {ligne.quantite}
            </div>
            <input type="hidden" {...register(`lignes.${index}.ligneId`)} />
            <FormField
              label="Fournisseur"
              htmlFor={`lignes.${index}.fournisseur`}
              error={errors.lignes?.[index]?.fournisseur?.message}
            >
              <Input id={`lignes.${index}.fournisseur`} {...register(`lignes.${index}.fournisseur`)} />
            </FormField>
            <FormField label="Mode" htmlFor={`lignes.${index}.modeTarification`}>
              <NativeSelect
                id={`lignes.${index}.modeTarification`}
                {...register(`lignes.${index}.modeTarification`)}
              >
                <option value="CALCULE">Calculé (prix unitaire × quantité)</option>
                <option value="FORFAITAIRE">Forfaitaire</option>
              </NativeSelect>
            </FormField>
            {lignesValues?.[index]?.modeTarification === "FORFAITAIRE" ? (
              <FormField
                label="Montant forfaitaire (HT)"
                htmlFor={`lignes.${index}.montantForfaitaire`}
                error={errors.lignes?.[index]?.montantForfaitaire?.message}
              >
                <Input
                  id={`lignes.${index}.montantForfaitaire`}
                  type="number"
                  min={0}
                  {...register(`lignes.${index}.montantForfaitaire`, { valueAsNumber: true })}
                />
              </FormField>
            ) : (
              <FormField
                label="Prix unitaire (HT)"
                htmlFor={`lignes.${index}.prixUnitaire`}
                error={errors.lignes?.[index]?.prixUnitaire?.message}
              >
                <Input
                  id={`lignes.${index}.prixUnitaire`}
                  type="number"
                  min={0}
                  {...register(`lignes.${index}.prixUnitaire`, { valueAsNumber: true })}
                />
              </FormField>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Date de livraison prévue"
          htmlFor="dateLivraisonPrevue"
          error={errors.dateLivraisonPrevue?.message}
        >
          <Input id="dateLivraisonPrevue" type="date" {...register("dateLivraisonPrevue")} />
        </FormField>
        <FormField label="Taux de TVA (%)" htmlFor="tauxTva" error={errors.tauxTva?.message}>
          <Input
            id="tauxTva"
            type="number"
            min={0}
            step={0.01}
            {...register("tauxTva", { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Type de paiement" htmlFor="typePaiement">
          <NativeSelect id="typePaiement" {...register("typePaiement")}>
            <option value="CHEQUE">Chèque</option>
            <option value="VIREMENT">Virement</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile money</option>
          </NativeSelect>
        </FormField>
        <FormField label="Échéance de paiement" htmlFor="echeancePaiementJours">
          <NativeSelect
            id="echeancePaiementJours"
            {...register("echeancePaiementJours", { valueAsNumber: true })}
          >
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
          </NativeSelect>
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4 rounded border-input" {...register("urgent")} />
        Urgent (sous le seuil configuré — Bon de Commande émis immédiatement)
      </label>

      {!urgent && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Validateurs requis (sélection dynamique — tous doivent valider, un refus bloque tout)
          </p>
          <div className="flex flex-wrap gap-4">
            {ROLES.map((role) => (
              <label key={role.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={role.value}
                  className="size-4 rounded border-input"
                  {...register("rolesSelectionnes")}
                />
                {role.label}
              </label>
            ))}
          </div>
          {errors.rolesSelectionnes && (
            <p className="text-sm text-status-danger">{errors.rolesSelectionnes.message}</p>
          )}
        </div>
      )}

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Envoi..." : urgent ? "Émettre le Bon de Commande" : "Envoyer en validation parallèle"}
      </Button>
    </form>
  );
}
