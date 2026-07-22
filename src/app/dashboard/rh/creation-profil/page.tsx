import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerProfils } from "@/lib/server-actions/rh-profils";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LABEL_TYPE_PROFIL: Record<string, string> = {
  AGENT: "Agent",
  SOUS_TRAITANT: "Sous-traitant",
  OUVRIER: "Ouvrier",
};

export default async function CreationProfilPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "rh", "creation-profil");

  const utilisateurs = await listerProfils();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profils employés"
        description="Complétez le profil RH d'un compte depuis sa fiche détail."
      />

      {utilisateurs.length === 0 ? (
        <EmptyState title="Aucun compte" description="Aucun compte utilisateur n'existe encore." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Solde congés</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilisateurs.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.prenom} {u.nom}
                    </TableCell>
                    <TableCell>
                      {u.profilEmploye ? LABEL_TYPE_PROFIL[u.profilEmploye.typeProfil] : "—"}
                    </TableCell>
                    <TableCell>{u.profilEmploye?.poste ?? "Non renseigné"}</TableCell>
                    <TableCell>{u.profilEmploye?.service ?? "—"}</TableCell>
                    <TableCell>
                      {u.profilEmploye ? `${u.profilEmploye.soldeConges} jours` : "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/authentification-roles/gestion-comptes-acces/${u.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {u.profilEmploye ? "Modifier" : "Compléter"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
