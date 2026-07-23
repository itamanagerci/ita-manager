import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  listerTypesPiecesAdministratives,
  listerPiecesAdministratives,
  verifierEtCreerAlertesExpirationPieces,
} from "@/lib/server-actions/pieces-admin-vehicules";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieceAdministrativeForm } from "@/components/logistique/piece-administrative-form";

export default async function PiecesAdminVehiculesPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "pieces-admin-vehicules");

  await verifierEtCreerAlertesExpirationPieces();

  const [types, pieces, vehicules] = await Promise.all([
    listerTypesPiecesAdministratives(),
    listerPiecesAdministratives(),
    prisma.vehicule.findMany({
      select: { id: true, immatriculation: true },
      orderBy: { immatriculation: "asc" },
    }),
  ]);

  const maintenant = new Date();

  function tonaliteExpiration(dateExpiration: Date | null): Tonalite {
    if (!dateExpiration) return "neutre";
    if (dateExpiration < maintenant) return "danger";
    const dansTrenteJours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (dateExpiration < dansTrenteJours) return "attention";
    return "succes";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pièces administratives véhicules/engins"
        description="Suivi documentaire par véhicule — CT, assurance, VGP et autres pièces."
        actions={<PieceAdministrativeForm vehicules={vehicules} types={types} />}
      />

      {pieces.length === 0 ? (
        <EmptyState title="Aucune pièce enregistrée" description="Ajoutez la première pièce avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date d&apos;émission</TableHead>
                  <TableHead>Date d&apos;expiration</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieces.map((piece) => (
                  <TableRow key={piece.id}>
                    <TableCell className="font-medium">{piece.vehicule.immatriculation}</TableCell>
                    <TableCell>{piece.typePiece.nom}</TableCell>
                    <TableCell>{piece.dateEmission?.toLocaleDateString("fr-FR") ?? "—"}</TableCell>
                    <TableCell>{piece.dateExpiration?.toLocaleDateString("fr-FR") ?? "—"}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={
                          !piece.dateExpiration
                            ? "N/A"
                            : piece.dateExpiration < maintenant
                              ? "Expirée"
                              : tonaliteExpiration(piece.dateExpiration) === "attention"
                                ? "Expiration proche"
                                : "Valide"
                        }
                        tonalite={tonaliteExpiration(piece.dateExpiration)}
                      />
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
