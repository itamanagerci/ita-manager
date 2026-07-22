import { redirect } from "next/navigation";
import {
  getCurrentUtilisateur,
  getModulesAccessibles,
  peutGererComptes,
} from "@/lib/server-actions/acces";
import { requireCompteActif } from "@/lib/server-actions/guards";
import {
  listerNotifications,
  verifierEtCreerAlertesEcheance,
} from "@/lib/server-actions/gestion-projet";
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

  // Vérification "pull" à chaque navigation (pas de tâche planifiée dans ce
  // projet) — doit se terminer avant listerNotifications() pour que les
  // alertes fraîchement créées apparaissent dès cette même requête.
  await verifierEtCreerAlertesEcheance(utilisateur.id);

  const [modules, gestionComptesAutorisee, notificationsBrutes] = await Promise.all([
    getModulesAccessibles(utilisateur.id),
    peutGererComptes(utilisateur.id),
    listerNotifications(),
  ]);

  const notifications = notificationsBrutes.map((n) => ({
    id: n.id,
    titre: n.titre,
    description: n.description ?? undefined,
    lu: n.lu,
    date: n.dateCreation,
    href: n.lienDetail ?? undefined,
  }));

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
          notifications={notifications}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
