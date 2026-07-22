"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import type { StatutUtilisateur } from "@prisma/client";
import {
  basculerStatutUtilisateur,
  supprimerUtilisateur,
} from "@/lib/server-actions/gestion-comptes";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UtilisateurRowActionsProps {
  utilisateurId: string;
  nomComplet: string;
  statut: StatutUtilisateur;
}

export function UtilisateurRowActions({
  utilisateurId,
  nomComplet,
  statut,
}: UtilisateurRowActionsProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [dialogStatut, setDialogStatut] = useState(false);
  const [dialogSuppression, setDialogSuppression] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const nouveauStatut: StatutUtilisateur = statut === "ACTIF" ? "INACTIF" : "ACTIF";

  async function confirmerChangementStatut() {
    setEnCours(true);
    const resultat = await basculerStatutUtilisateur(utilisateurId, nouveauStatut);
    setEnCours(false);
    setDialogStatut(false);

    if ("erreur" in resultat) {
      notifier.erreur("Échec", resultat.erreur);
      return;
    }
    notifier.succes(
      nouveauStatut === "INACTIF" ? "Compte suspendu" : "Compte réactivé",
      nomComplet,
    );
    router.refresh();
  }

  async function confirmerSuppression() {
    setEnCours(true);
    const resultat = await supprimerUtilisateur(utilisateurId);
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreurSuppression(resultat.erreur);
      return;
    }
    setDialogSuppression(false);
    notifier.succes("Compte supprimé", nomComplet);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/authentification-roles/gestion-comptes-acces/${utilisateurId}`}>
              <Pencil className="size-4" />
              Modifier
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialogStatut(true)}>
            <Power className="size-4" />
            {statut === "ACTIF" ? "Suspendre" : "Réactiver"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setErreurSuppression(null);
              setDialogSuppression(true);
            }}
          >
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogStatut} onOpenChange={setDialogStatut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statut === "ACTIF" ? "Suspendre ce compte ?" : "Réactiver ce compte ?"}
            </DialogTitle>
            <DialogDescription>
              {statut === "ACTIF"
                ? `${nomComplet} sera déconnecté(e) immédiatement et ne pourra plus se connecter jusqu'à réactivation.`
                : `${nomComplet} pourra de nouveau se connecter.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogStatut(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button onClick={confirmerChangementStatut} disabled={enCours}>
              {enCours ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSuppression} onOpenChange={setDialogSuppression}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {nomComplet} ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible : le compte d&apos;authentification et la fiche
              utilisateur seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          {erreurSuppression && (
            <p className="text-sm text-status-danger">{erreurSuppression}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogSuppression(false)}
              disabled={enCours}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmerSuppression} disabled={enCours}>
              {enCours ? "..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
