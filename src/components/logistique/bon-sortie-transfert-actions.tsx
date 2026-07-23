"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { viserExpediteur, viserResponsableSortie } from "@/lib/server-actions/bon-sortie-transfert";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";

interface BonSortieTransfertActionsProps {
  bonId: string;
  statut: "CREE" | "ARTICLES_RENSEIGNES" | "SIGNE";
}

export function BonSortieTransfertActions({ bonId, statut }: BonSortieTransfertActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [enCours, setEnCours] = useState(false);

  async function confirmerExpediteur() {
    setEnCours(true);
    const resultat = await viserExpediteur(bonId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec du visa", resultat.erreur);
      return;
    }
    notifier.succes("Visa Expéditeur-Convoyeur enregistré");
    router.refresh();
  }

  async function confirmerResponsableSortie() {
    setEnCours(true);
    const resultat = await viserResponsableSortie(bonId);
    setEnCours(false);
    if ("erreur" in resultat) {
      notifier.erreur("Échec de la signature", resultat.erreur);
      return;
    }
    notifier.succes("Signature Responsable de Sortie enregistrée", "Le stock a été décrémenté.");
    router.refresh();
  }

  if (statut === "CREE") {
    return (
      <Button size="sm" onClick={confirmerExpediteur} disabled={enCours}>
        {enCours ? "..." : "Viser (Expéditeur)"}
      </Button>
    );
  }
  if (statut === "ARTICLES_RENSEIGNES") {
    return (
      <Button size="sm" onClick={confirmerResponsableSortie} disabled={enCours}>
        {enCours ? "..." : "Signer (Responsable de Sortie)"}
      </Button>
    );
  }
  return null;
}
