import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** false pour un usage imbriqué dans un conteneur déjà bordé (ex. Card
   *  compacte) — évite un double cadre. Défaut true. */
  bordered?: boolean;
  className?: string;
}

export function EmptyState({ title, description, bordered = true, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-10 text-center",
        bordered && "rounded-xl border-2 border-dashed border-border bg-background",
        className,
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
