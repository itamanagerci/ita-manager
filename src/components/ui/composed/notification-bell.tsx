"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NotificationItem {
  id: string;
  titre: string;
  description?: string;
  lu: boolean;
  date: Date;
  href?: string;
}

interface NotificationBellProps {
  notifications: NotificationItem[];
  onMarquerCommeLue?: (id: string) => void;
}

/**
 * UI générique de notifications — aucune donnée métier connectée dans ce
 * lot (liste vide par défaut). Les futurs modules alimenteront cette liste
 * via le même pattern (entiteType/entiteId) que HistoriqueStatut.
 */
export function NotificationBell({ notifications, onMarquerCommeLue }: NotificationBellProps) {
  const nombreNonLues = notifications.filter((n) => !n.lu).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {nombreNonLues > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-medium text-white">
              {nombreNonLues}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Aucune notification
          </p>
        ) : (
          notifications.map((notification) => {
            const contenu = (
              <div className="flex w-full flex-col gap-0.5">
                <span className={notification.lu ? "font-normal" : "font-semibold"}>
                  {notification.titre}
                </span>
                {notification.description && (
                  <span className="text-xs text-muted-foreground">
                    {notification.description}
                  </span>
                )}
              </div>
            );

            return (
              <DropdownMenuItem
                key={notification.id}
                onSelect={() => onMarquerCommeLue?.(notification.id)}
                asChild={Boolean(notification.href)}
              >
                {notification.href ? <Link href={notification.href}>{contenu}</Link> : contenu}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
