"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { creerInspectionHSE } from "@/lib/server-actions/qhse-inspection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import { useNotifier } from "@/hooks/use-notifier";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PointInspectionHSE {
  id: string;
  libelle: string;
  ordre: number;
}

interface InspectionHSEFormProps {
  points: PointInspectionHSE[];
  projets: { id: string; nom: string }[];
}

interface HeaderValues {
  projetId?: string;
  chantierLibre?: string;
  projetOuvrageLibre?: string;
  lieu?: string;
  date: string;
  heure?: string;
  commentaires?: string;
}

/// Groupes fixes tirés du document réel (Base vie ×8, Poste de travail ×5,
/// Sensibilisation & EPI ×9, Personnel chantier ×2, Gestion déchets ×2) —
/// dérivés de l'index d'ordre, aucune colonne de sous-catégorie sur
/// PointInspection lui-même.
function libelleGroupe(ordre: number): string | null {
  if (ordre === 0) return "Base vie";
  if (ordre === 8) return "Poste de travail";
  if (ordre === 13) return "Sensibilisation & EPI";
  if (ordre === 22) return "Personnel chantier";
  if (ordre === 24) return "Gestion déchets";
  return null;
}

export function InspectionHSEForm({ points, projets }: InspectionHSEFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [reponses, setReponses] = useState<Record<string, { reponse?: "OUI" | "NON"; observation: string }>>(
    {},
  );

  const { register, handleSubmit, reset } = useForm<HeaderValues>({
    defaultValues: { projetId: projets[0]?.id ?? "", date: "" },
  });

  function definirReponse(pointId: string, reponse: "OUI" | "NON") {
    setReponses((prec) => ({ ...prec, [pointId]: { ...prec[pointId], reponse } }));
  }
  function definirObservation(pointId: string, observation: string) {
    setReponses((prec) => ({ ...prec, [pointId]: { ...prec[pointId], observation } }));
  }

  async function onSubmit(header: HeaderValues) {
    setErreur(null);

    const reponsesPoints = points.map((point) => ({
      pointId: point.id,
      reponse: reponses[point.id]?.reponse,
      observation: reponses[point.id]?.observation || undefined,
    }));
    if (reponsesPoints.some((r) => !r.reponse)) {
      setErreur("Les 26 points doivent tous être renseignés (Oui/Non).");
      return;
    }

    setEnCours(true);
    const resultat = await creerInspectionHSE({
      ...header,
      reponsesPoints: reponsesPoints as { pointId: string; reponse: "OUI" | "NON"; observation?: string }[],
    });
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset();
    setReponses({});
    notifier.succes("Inspection HSE enregistrée", "Toute réponse NON a créé une Non-Conformité.");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle inspection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Fiche d&apos;Inspection HSE</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Projet/Ouvrage" htmlFor="projetOuvrageLibre">
              <Input id="projetOuvrageLibre" {...register("projetOuvrageLibre")} />
            </FormField>
            <FormField label="Lieu" htmlFor="lieu">
              <Input id="lieu" {...register("lieu")} />
            </FormField>
            <FormField label="Date" htmlFor="date">
              <Input id="date" type="date" {...register("date", { required: true })} />
            </FormField>
            <FormField label="Heure" htmlFor="heure">
              <Input id="heure" type="time" {...register("heure")} />
            </FormField>
            <FormField label="Chantier" htmlFor="projetId">
              <NativeSelect id="projetId" {...register("projetId")}>
                <option value="">Aucun</option>
                {projets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Chantier (texte libre)" htmlFor="chantierLibre">
              <Input id="chantierLibre" {...register("chantierLibre")} />
            </FormField>
          </div>

          <Separator />

          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            A — Points à contrôler (26)
          </p>
          <div className="flex flex-col gap-3">
            {points.map((point) => {
              const groupe = libelleGroupe(point.ordre);
              return (
                <div key={point.id}>
                  {groupe && (
                    <p className="mt-2 text-xs font-semibold tracking-wide text-primary uppercase">{groupe}</p>
                  )}
                  <div className="grid grid-cols-[1fr_auto_auto_1fr] items-center gap-3 rounded-md border border-border p-2">
                    <span className="text-sm">{point.libelle}</span>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name={`reponse-${point.id}`}
                        checked={reponses[point.id]?.reponse === "OUI"}
                        onChange={() => definirReponse(point.id, "OUI")}
                      />
                      Oui
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name={`reponse-${point.id}`}
                        checked={reponses[point.id]?.reponse === "NON"}
                        onChange={() => definirReponse(point.id, "NON")}
                      />
                      Non
                    </label>
                    <Input
                      placeholder="Observation"
                      value={reponses[point.id]?.observation ?? ""}
                      onChange={(e) => definirObservation(point.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          <FormField label="C — Commentaires" htmlFor="commentaires">
            <Input id="commentaires" {...register("commentaires")} />
          </FormField>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Envoi..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
