import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { getModulesMetier } from "@/lib/server-actions/demande-index";
import { tonaliteDepuisStatutLibelle } from "@/lib/demande-index-tonalite";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ValidationsCentraliseesPageProps {
  searchParams: Promise<{ module?: string }>;
}

export default async function ValidationsCentraliseesPage({
  searchParams,
}: ValidationsCentraliseesPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-generale", "validations-centralisees");

  const { module: moduleFiltre } = await searchParams;
  const modulesMetier = await getModulesMetier();
  const nomModule = new Map(modulesMetier.map((m) => [m.code, m.nom]));

  const demandes = await prisma.demandeIndex.findMany({
    where: {
      OR: [
        { enAttenteValidationUtilisateurId: utilisateur.id },
        { enAttenteValidationDe: utilisateur.niveauHierarchique },
      ],
      ...(moduleFiltre ? { typeModule: moduleFiltre } : {}),
    },
    include: { demandeur: true },
    orderBy: { dateSoumission: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Validations centralisées"
        description="Toutes les demandes en attente de votre validation, tous modules confondus."
      />

      <form method="GET" className="flex items-center gap-2">
        <label htmlFor="module" className="text-sm text-muted-foreground">
          Module
        </label>
        <select
          id="module"
          name="module"
          defaultValue={moduleFiltre ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tous les modules</option>
          {modulesMetier.map((module) => (
            <option key={module.code} value={module.code}>
              {module.nom}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Filtrer
        </button>
      </form>

      {demandes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
            <p className="font-medium text-foreground">Aucune demande en attente</p>
            <p className="text-sm text-muted-foreground">
              C&apos;est l&apos;état normal tant qu&apos;aucun module métier n&apos;alimente
              encore cette liste — pas une anomalie.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Soumis le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell>
                      <Link
                        href={demande.lienDetail ?? `/dashboard/${demande.typeModule}/${demande.sousModule}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {demande.reference ?? "Voir le détail"}
                      </Link>
                    </TableCell>
                    <TableCell>{nomModule.get(demande.typeModule) ?? demande.typeModule}</TableCell>
                    <TableCell>
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
                    <TableCell>
                      {demande.montant != null
                        ? `${Number(demande.montant).toLocaleString("fr-FR")} FCFA`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatutBadge
                        label={demande.statutLibelle}
                        tonalite={tonaliteDepuisStatutLibelle(demande.statutLibelle)}
                      />
                    </TableCell>
                    <TableCell>{demande.dateSoumission.toLocaleDateString("fr-FR")}</TableCell>
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
