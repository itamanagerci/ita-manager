"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mettreAJourAccesIndividuels } from "@/lib/server-actions/gestion-comptes";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ModuleAvecSousModules {
  id: string;
  nom: string;
  sousModules: { id: string; nom: string }[];
}

interface AccesIndividuelsFormProps {
  utilisateurId: string;
  modules: ModuleAvecSousModules[];
  sousModuleIdsActifsInitial: string[];
}

export function AccesIndividuelsForm({
  utilisateurId,
  modules,
  sousModuleIdsActifsInitial,
}: AccesIndividuelsFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [coches, setCoches] = useState(() => new Set(sousModuleIdsActifsInitial));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function basculer(sousModuleId: string) {
    setCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(sousModuleId)) suivant.delete(sousModuleId);
      else suivant.add(sousModuleId);
      return suivant;
    });
  }

  async function enregistrer() {
    setErreur(null);
    setEnCours(true);
    const resultat = await mettreAJourAccesIndividuels(utilisateurId, Array.from(coches));
    setEnCours(false);

    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }
    notifier.succes("Accès mis à jour");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion type="multiple" className="w-full">
        {modules.map((module) => (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger>{module.nom}</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-2 pl-2">
                {module.sousModules.map((sousModule) => (
                  <label key={sousModule.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={coches.has(sousModule.id)}
                      onChange={() => basculer(sousModule.id)}
                      className="size-4 rounded border-input"
                    />
                    {sousModule.nom}
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button onClick={enregistrer} disabled={enCours} className="self-start">
        {enCours ? "Enregistrement..." : "Enregistrer les accès"}
      </Button>
    </div>
  );
}
