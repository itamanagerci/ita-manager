"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ModuleNav } from "@/types/navigation";

interface SidebarProps {
  modules: ModuleNav[];
}

function resoudreIcone(nom: string | null) {
  if (!nom) return Icons.Circle;
  const IconeTrouvee = (Icons as unknown as Record<string, Icons.LucideIcon>)[nom];
  return IconeTrouvee ?? Icons.Circle;
}

export function Sidebar({ modules }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-4">
        <span className="text-lg font-bold text-sidebar-foreground">ITA Digital</span>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {modules.map((module) => {
            const Icone = resoudreIcone(module.icone);

            if (module.sousModules.length === 1) {
              const sousModule = module.sousModules[0];
              const href = `/dashboard/${module.code}/${sousModule.code}`;
              const estActif = pathname.startsWith(`/dashboard/${module.code}`);
              return (
                <Link
                  key={module.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent",
                    estActif && "bg-sidebar-accent",
                  )}
                >
                  <Icone className="size-4" />
                  {module.nom}
                </Link>
              );
            }

            return (
              <Accordion key={module.id} type="single" collapsible>
                <AccordionItem value={module.id} className="border-none">
                  <AccordionTrigger className="rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Icone className="size-4" />
                      {module.nom}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0 pl-6">
                    <div className="flex flex-col gap-1">
                      {module.sousModules.map((sousModule) => {
                        const href = `/dashboard/${module.code}/${sousModule.code}`;
                        const estActif = pathname === href;
                        return (
                          <Link
                            key={sousModule.id}
                            href={href}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
                              estActif && "bg-sidebar-accent",
                            )}
                          >
                            {sousModule.nom}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
