import { NotificationBell } from "@/components/ui/composed/notification-bell";
import { UserMenu } from "@/components/ui/composed/user-menu";

interface TopbarProps {
  utilisateur: { nom: string; prenom: string; fonction: string };
}

export function Topbar({ utilisateur }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-2">
        <NotificationBell notifications={[]} />
        <UserMenu
          nom={utilisateur.nom}
          prenom={utilisateur.prenom}
          fonction={utilisateur.fonction}
        />
      </div>
    </header>
  );
}
