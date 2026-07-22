"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  contreProposerLigne,
  refuserLigne,
  validerLigneDirectement,
} from "@/lib/server-actions/demande-rh-projet";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LigneActionsProps {
  ligneId: string;
  ouvriers: { id: string; nom: string; prenom: string }[];
}

export function LigneActions({ ligneId, ouvriers }: LigneActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialog, setDialog] = useState<"valider" | "contreProposer" | "refuser" | null>(null);
  const [ouvrierId, setOuvrierId] = useState(ouvriers[0]?.id ?? "");
  const [competence, setCompetence] = useState("");
  const [taux, setTaux] = useState("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function fermer() {
    setDialog(null);
    setErreur(null);
    setCompetence("");
    setTaux("");
    setMotif("");
  }

  async function confirmerValidation() {
    setErreur(null);
    setEnCours(true);
    const resultat = await validerLigneDirectement(ligneId, ouvrierId);
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    fermer();
    notifier.succes("Ligne validée");
    router.refresh();
  }

  async function confirmerContrePropostion() {
    setErreur(null);
    setEnCours(true);
    const resultat = await contreProposerLigne(ligneId, ouvrierId, competence, Number(taux));
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    fermer();
    notifier.succes("Contre-proposition envoyée");
    router.refresh();
  }

  async function confirmerRefus() {
    setErreur(null);
    setEnCours(true);
    const resultat = await refuserLigne(ligneId, motif);
    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    fermer();
    notifier.succes("Ligne refusée");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setDialog("valider")}>
        Valider
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDialog("contreProposer")}>
        Contre-proposer
      </Button>
      <Button size="sm" variant="outline" onClick={() => setDialog("refuser")}>
        Refuser
      </Button>

      <Dialog open={dialog === "valider"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider cette ligne</DialogTitle>
          </DialogHeader>
          <FormField label="Ouvrier" htmlFor="ouvrierValider">
            <NativeSelect id="ouvrierValider" value={ouvrierId} onChange={(e) => setOuvrierId(e.target.value)}>
              {ouvriers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.prenom} {o.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={fermer} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmerValidation} disabled={enCours}>
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "contreProposer"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contre-proposer un profil</DialogTitle>
          </DialogHeader>
          <FormField label="Ouvrier" htmlFor="ouvrierContrePropose">
            <NativeSelect id="ouvrierContrePropose" value={ouvrierId} onChange={(e) => setOuvrierId(e.target.value)}>
              {ouvriers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.prenom} {o.nom}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Compétence proposée" htmlFor="competenceProposee">
            <Input id="competenceProposee" value={competence} onChange={(e) => setCompetence(e.target.value)} />
          </FormField>
          <FormField label="Taux journalier proposé" htmlFor="tauxPropose">
            <Input id="tauxPropose" type="number" min={0} value={taux} onChange={(e) => setTaux(e.target.value)} />
          </FormField>
          {erreur && <p className="text-sm text-status-danger">{erreur}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={fermer} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmerContrePropostion} disabled={enCours}>
              {enCours ? "..." : "Envoyer la contre-proposition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "refuser"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser cette ligne</DialogTitle>
          </DialogHeader>
          <FormField label="Motif" htmlFor="motifRefusLigne" error={erreur ?? undefined}>
            <Input id="motifRefusLigne" value={motif} onChange={(e) => setMotif(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={fermer} disabled={enCours}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmerRefus} disabled={enCours}>
              {enCours ? "..." : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
