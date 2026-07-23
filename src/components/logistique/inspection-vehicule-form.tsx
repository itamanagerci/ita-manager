"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creerInspectionVehicule } from "@/lib/server-actions/inspection-vehicule";
import {
  creerInspectionVehiculeSchema,
  type CreerInspectionVehiculeInput,
} from "@/types/validations/vehicules";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/composed/form-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InspectionVehiculeFormProps {
  vehicules: { id: string; immatriculation: string }[];
  points: { id: string; libelle: string }[];
  documents: { id: string; libelle: string }[];
  chefs: { id: string; nom: string; prenom: string }[];
}

export function InspectionVehiculeForm({ vehicules, points, documents, chefs }: InspectionVehiculeFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const defaultValues: CreerInspectionVehiculeInput = {
    vehiculeId: vehicules[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    chantierSiteLieu: "",
    kilometrage: 0,
    destination: "",
    conducteurNom: "",
    niveauCarburant: 50,
    points: points.map((p) => ({ pointId: p.id, etat: "BON" as const })),
    documents: documents.map((d) => ({ documentId: d.id, etat: "BON" as const })),
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreerInspectionVehiculeInput>({
    resolver: zodResolver(creerInspectionVehiculeSchema),
    defaultValues,
  });

  const { fields: pointFields } = useFieldArray({ control, name: "points" });
  const { fields: documentFields } = useFieldArray({ control, name: "documents" });

  async function onSubmit(values: CreerInspectionVehiculeInput) {
    setErreur(null);
    setEnCours(true);

    const resultat = await creerInspectionVehicule(values);

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    setDialogOuvert(false);
    reset(defaultValues);
    notifier.succes("Inspection enregistrée");
    router.refresh();
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger asChild>
        <Button>Nouvelle inspection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiche d&apos;Inspection Entrée — Véhicule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Véhicule" htmlFor="vehiculeId" error={errors.vehiculeId?.message}>
              <NativeSelect id="vehiculeId" {...register("vehiculeId")}>
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.immatriculation}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Date" htmlFor="date" error={errors.date?.message}>
              <Input id="date" type="date" {...register("date")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Heure" htmlFor="heure" helperText="Optionnel">
              <Input id="heure" type="time" {...register("heure")} />
            </FormField>
            <FormField
              label="Chantier/site/lieu"
              htmlFor="chantierSiteLieu"
              error={errors.chantierSiteLieu?.message}
            >
              <Input id="chantierSiteLieu" {...register("chantierSiteLieu")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kilométrage" htmlFor="kilometrage" error={errors.kilometrage?.message}>
              <Input id="kilometrage" type="number" min={0} {...register("kilometrage", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Destination" htmlFor="destination" error={errors.destination?.message}>
              <Input id="destination" {...register("destination")} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Conducteur" htmlFor="conducteurNom" error={errors.conducteurNom?.message}>
              <Input id="conducteurNom" {...register("conducteurNom")} />
            </FormField>
            <FormField label="Transporteur" htmlFor="transporteurNom" helperText="Optionnel">
              <Input id="transporteurNom" {...register("transporteurNom")} />
            </FormField>
          </div>

          <FormField
            label="Niveau carburant (%)"
            htmlFor="niveauCarburant"
            error={errors.niveauCarburant?.message}
          >
            <Input
              id="niveauCarburant"
              type="number"
              min={0}
              max={100}
              {...register("niveauCarburant", { valueAsNumber: true })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Chef Chantier" htmlFor="chefChantierId" helperText="Optionnel — signature">
              <NativeSelect id="chefChantierId" {...register("chefChantierId")}>
                <option value="">—</option>
                {chefs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Remorqueur du véhicule" htmlFor="remorqueurNom" helperText="Optionnel — signature">
              <Input id="remorqueurNom" {...register("remorqueurNom")} />
            </FormField>
          </div>

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            30 points de contrôle
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Point</TableHead>
                <TableHead className="w-32">État</TableHead>
                <TableHead>Observation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pointFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>{points[index]?.libelle}</TableCell>
                  <TableCell>
                    <NativeSelect {...register(`points.${index}.etat`)}>
                      <option value="BON">Bon</option>
                      <option value="MAUVAIS">Mauvais</option>
                      <option value="ABSENT">Absent</option>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <Input {...register(`points.${index}.observation`)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            10 documentations
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="w-32">État</TableHead>
                <TableHead>Observation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentFields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>{documents[index]?.libelle}</TableCell>
                  <TableCell>
                    <NativeSelect {...register(`documents.${index}.etat`)}>
                      <option value="BON">Bon</option>
                      <option value="MAUVAIS">Mauvais</option>
                      <option value="ABSENT">Absent</option>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <Input {...register(`documents.${index}.observation`)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

          <DialogFooter>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement..." : "Signer et archiver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
