import { redirect } from "next/navigation";
import {
  getCurrentUtilisateur,
  getModulesAccessibles,
  peutGererComptes,
} from "@/lib/server-actions/acces";
import { requireCompteActif } from "@/lib/server-actions/guards";
import { Sidebar } from "@/components/ui/composed/sidebar";
import { Topbar } from "@/components/ui/composed/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireCompteActif(utilisateur);

  if (utilisateur.premiereConnexion) redirect("/premiere-connexion");

  const [modules, gestionComptesAutorisee] = await Promise.all([
    getModulesAccessibles(utilisateur.id),
    peutGererComptes(utilisateur.id),
  ]);

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar modules={modules} />
      <div className="flex flex-1 flex-col">
        <Topbar
          utilisateur={{
            nom: utilisateur.nom,
            prenom: utilisateur.prenom,
            fonction: utilisateur.fonction.nom,
          }}
          peutGererComptes={gestionComptesAutorisee}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
