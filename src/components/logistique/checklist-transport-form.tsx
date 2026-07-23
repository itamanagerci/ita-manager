"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enregistrerDepart, enregistrerRetour } from "@/lib/server-actions/demande-transport";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABEL_CATEGORIE: Record<string, string> = {
  MATERIEL_BORD: "Matériels à bord",
  PIECE_ADMINISTRATIVE: "Pièces administratives",
  DOCUMENT_SUIVI: "Documents de suivi",
};

interface ChecklistTransportFormProps {
  demandeId: string;
  mode: "depart" | "retour";
  items: { id: string; categorie: string; libelle: string }[];
  estEngin: boolean;
}

export function ChecklistTransportForm({ demandeId, mode, items, estEngin }: ChecklistTransportFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [conducteur, setConducteur] = useState("");
  const [compteur, setCompteur] = useState(0);
  const [referenceEngin, setReferenceEngin] = useState("");
  const [presences, setPresences] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.id, true])),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const categories = Array.from(new Set(items.map((item) => item.categorie)));

  async function confirmer() {
    setErreur(null);
    setEnCours(true);

    const reponses = items.map((item) => ({ itemId: item.id, present: presences[item.id] }));

    const resultat =
      mode === "depart"
        ? await enregistrerDepart({ demandeId, conducteurDepartNom: conducteur, compteurDepart: compteur, reponses })
        : await enregistrerRetour({
            demandeId,
            conducteurRetourNom: conducteur,
            compteurRetour: compteur,
            referenceEngin: estEngin ? referenceEngin : undefined,
            reponses,
          });

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes(mode === "depart" ? "Départ enregistré" : "Retour enregistré");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Conducteur" htmlFor={`conducteur-${mode}`}>
          <Input id={`conducteur-${mode}`} value={conducteur} onChange={(e) => setConducteur(e.target.value)} />
        </FormField>
        <FormField label="Compteur" htmlFor={`compteur-${mode}`}>
          <Input
            id={`compteur-${mode}`}
            type="number"
            min={0}
            value={compteur}
            onChange={(e) => setCompteur(Number(e.target.value))}
          />
        </FormField>
      </div>

      {mode === "retour" && estEngin && (
        <FormField label="Référence ITA" htmlFor="referenceEngin" helperText="Optionnel">
          <Input id="referenceEngin" value={referenceEngin} onChange={(e) => setReferenceEngin(e.target.value)} />
        </FormField>
      )}

      {categories.map((categorie) => (
        <div key={categorie} className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {LABEL_CATEGORIE[categorie]}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-32">Présent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter((item) => item.categorie === categorie)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.libelle}</TableCell>
                    <TableCell>
                      <NativeSelect
                        value={presences[item.id] ? "oui" : "non"}
                        onChange={(e) =>
                          setPresences((prev) => ({ ...prev, [item.id]: e.target.value === "oui" }))
                        }
                      >
                        <option value="oui">Oui</option>
                        <option value="non">Non</option>
                      </NativeSelect>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ))}

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button onClick={confirmer} disabled={enCours} className="self-start">
        {enCours ? "..." : mode === "depart" ? "Viser le départ" : "Viser le retour"}
      </Button>
    </div>
  );
}
