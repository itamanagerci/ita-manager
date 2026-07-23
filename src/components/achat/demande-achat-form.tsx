"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerDemandeAchat, resoumettreApresRefusDirecteur } from "@/lib/server-actions/achat-demandes";
import {
  creerDemandeAchatSchema,
  type CreerDemandeAchatInput,
} from "@/types/validations/achat";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DemandeAchatFormProps {
  articles: { id: string; designation: string }[];
  projets: { id: string; nom: string }[];
  modulesService: { code: string; nom: string }[];
  /** Présent = mode resoumission après refus Directeur, plutôt que création. */
  demandeId?: string;
  valeursInitiales?: CreerDemandeAchatInput;
  triggerLabel?: string;
}

const LIGNE_VIDE = { articleId: "", designationLibre: "", quantite: 1 };

export function DemandeAchatForm({
  articles,
  projets,
  modulesService,
  demandeId,
  valeursInitiales,
  triggerLabel,
}: DemandeAchatFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerDemandeAchatInput = valeursInitiales ?? {
    forType: "CHANTIER",
    projetId: projets[0]?.id ?? "",
    dateLivraisonSouhaitee: "",
    justification: "",
    lignes: [LIGNE_VIDE],
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreerDemandeAchatInput>({
    resolver: zodResolver(creerDemandeAchatSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });
  const forType = watch("forType");

  async function onSubmit(values: CreerDemandeAchatInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = demandeId
      ? await resoumettreApresRefusDirecteur(demandeId, values)
      : await creerDemandeAchat(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes(
      demandeId ? "Demande resoumise" : "Demande envoyée",
      demandeId ? "Transmise à nouveau au Directeur de département." : "Transmise à votre Directeur de département.",
    );
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button variant={demandeId ? "outline" : "default"} size={demandeId ? "sm" : "default"}>
          {triggerLabel ?? (demandeId ? "Corriger et resoumettre" : "Nouvelle demande d'achat")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {demandeId ? "Corriger et resoumettre la demande" : "Nouvelle demande d'achat"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <FormField label="Concerne" htmlFor="forType">
            <NativeSelect id="forType" {...register("forType")}>
              <option value="CHANTIER">Un chantier</option>
              <option value="SERVICE">Un service interne</option>
            </NativeSelect>
          </FormField>

          {forType === "SERVICE" ? (
            <FormField
              label="Service"
              htmlFor="forServiceModuleCode"
              error={errors.forServiceModuleCode?.message}
            >
              <NativeSelect id="forServiceModuleCode" {...register("forServiceModuleCode")}>
                <option value="">Sélectionner...</option>
                {modulesService.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          ) : (
            <>
              <FormField label="Chantier (projet)" htmlFor="projetId">
                <NativeSelect id="projetId" {...register("projetId")}>
                  <option value="">Aucun</option>
                  {projets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField
                label="Chantier (texte libre, si pas de projet)"
                htmlFor="chantierLibre"
                error={errors.chantierLibre?.message}
              >
                <Input id="chantierLibre" {...register("chantierLibre")} />
              </FormField>
            </>
          )}

          <Separator />

          <FormField label="Lieu de livraison (projet)" htmlFor="lieuLivraisonProjetId">
            <NativeSelect id="lieuLivraisonProjetId" {...register("lieuLivraisonProjetId")}>
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            label="Lieu de livraison (texte libre, si pas de projet)"
            htmlFor="lieuLivraisonLibre"
            error={errors.lieuLivraisonLibre?.message}
          >
            <Input id="lieuLivraisonLibre" {...register("lieuLivraisonLibre")} />
          </FormField>

          <FormField
            label="Date de livraison souhaitée"
            htmlFor="dateLivraisonSouhaitee"
            error={errors.dateLivraisonSouhaitee?.message}
          >
            <Input id="dateLivraisonSouhaitee" type="date" {...register("dateLivraisonSouhaitee")} />
          </FormField>

          <FormField label="Justification" htmlFor="justification" error={errors.justification?.message}>
            <Input id="justification" {...register("justification")} />
          </FormField>

          <Separator />

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Articles (Bordereau — désignations uniquement)
            </p>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
                <FormField label="Article du Bordereau" htmlFor={`lignes.${index}.articleId`}>
                  <NativeSelect id={`lignes.${index}.articleId`} {...register(`lignes.${index}.articleId`)}>
                    <option value="">Autre (saisie libre)</option>
                    {articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.designation}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField
                  label="Désignation libre (si non référencé)"
                  htmlFor={`lignes.${index}.designationLibre`}
                  error={errors.lignes?.[index]?.designationLibre?.message}
                >
                  <Input id={`lignes.${index}.designationLibre`} {...register(`lignes.${index}.designationLibre`)} />
                </FormField>
                <FormField
                  label="Quantité"
                  htmlFor={`lignes.${index}.quantite`}
                  error={errors.lignes?.[index]?.quantite?.message}
                >
                  <Input
                    id={`lignes.${index}.quantite`}
                    type="number"
                    min={1}
                    {...register(`lignes.${index}.quantite`, { valueAsNumber: true })}
                  />
                </FormField>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-3 self-start"
                    onClick={() => remove(index)}
                  >
                    Retirer cette ligne
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(LIGNE_VIDE)}>
              Ajouter une ligne
            </Button>
          </div>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : demandeId ? "Resoumettre" : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
