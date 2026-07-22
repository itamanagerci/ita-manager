import { Search } from "lucide-react";
import { NotificationBell } from "@/components/ui/composed/notification-bell";
import { UserMenu } from "@/components/ui/composed/user-menu";
import { Input } from "@/components/ui/input";

interface TopbarProps {
  utilisateur: { nom: string; prenom: string; fonction: string };
  peutGererComptes: boolean;
}

export function Topbar({ utilisateur, peutGererComptes }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* Non fonctionnelle pour l'instant — désactivée explicitement plutôt
            que de promettre une recherche qui ne ferait rien. */}
        <Input disabled placeholder="Rechercher..." className="pl-9" />
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell notifications={[]} />
        <UserMenu
          nom={utilisateur.nom}
          prenom={utilisateur.prenom}
          fonction={utilisateur.fonction}
          peutGererComptes={peutGererComptes}
        />
      </div>
    </header>
  );
}
