import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { getModulesMetier } from "@/lib/server-actions/demande-index";
import { tonaliteDepuisStatutLibelle } from "@/lib/demande-index-tonalite";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
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
        <NativeSelect
          id="module"
          name="module"
          defaultValue={moduleFiltre ?? ""}
          className="w-auto"
        >
          <option value="">Tous les modules</option>
          {modulesMetier.map((module) => (
            <option key={module.code} value={module.code}>
              {module.nom}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      {demandes.length === 0 ? (
        <EmptyState
          title="Aucune demande en attente"
          description="C'est l'état normal tant qu'aucun module métier n'alimente encore cette liste — pas une anomalie."
        />
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
