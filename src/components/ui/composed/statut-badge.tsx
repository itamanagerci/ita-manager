import { cn } from "@/lib/utils";

export type Tonalite = "neutre" | "info" | "attention" | "succes" | "danger";

interface StatutBadgeProps {
  label: string;
  tonalite: Tonalite;
  className?: string;
}

const tonaliteVersClasse: Record<Tonalite, string> = {
  neutre: "bg-status-neutral",
  info: "bg-status-info",
  attention: "bg-status-attention",
  succes: "bg-status-success",
  danger: "bg-status-danger",
};

/**
 * Pastille de statut générique — aucune donnée métier couplée. Chaque futur
 * module (Achat, Congés, QHSE...) mappe son propre enum de statut vers une
 * `tonalite` avant d'appeler ce composant.
 */
export function StatutBadge({ label, tonalite, className }: StatutBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", tonaliteVersClasse[tonalite])}
        aria-hidden
      />
      {label}
    </span>
  );
}
