import { redirect } from "next/navigation";
import { obtenirSessionInventaire } from "@/lib/server-actions/inventaire-periodique";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LigneComptageForm } from "@/components/logistique/ligne-comptage-form";
import { CloturerSessionButton } from "@/components/logistique/cloturer-session-button";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionInventaireDetailPage({ params }: SessionDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const { sessionId } = await params;

  const session = await obtenirSessionInventaire(sessionId);
  if (!session) redirect("/dashboard/logistique/inventaire-periodique");

  const [peutCloturer, materiels] = await Promise.all([
    possedeAccesSousModule(utilisateur.id, "logistique", "magasins"),
    prisma.materiel.findMany({
      where: { magasinId: session.magasinId },
      select: { id: true, designation: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  const lignesParMateriel = new Map(session.lignes.map((ligne) => [ligne.materielId, ligne]));
  const estCloturee = session.statut === "CLOTUREE";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`FIC-${String(session.numero).padStart(5, "0")}`}
        description={`${session.magasin.code} — ${session.magasin.nom}`}
        actions={
          !estCloturee && peutCloturer ? <CloturerSessionButton sessionId={session.id} /> : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Statut :{" "}
            <StatutBadge
              label={estCloturee ? "Clôturée" : "En cours"}
              tonalite={estCloturee ? "succes" : "attention"}
            />
          </p>
          {session.effectuePar && (
            <p>
              Comptage par {session.effectuePar.prenom} {session.effectuePar.nom}
            </p>
          )}
          {session.validePar && (
            <p>
              Validée par {session.validePar.prenom} {session.validePar.nom}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comptage physique</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Quantité théorique</TableHead>
                <TableHead>Comptage</TableHead>
                <TableHead>Écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiels.map((materiel) => {
                const ligne = lignesParMateriel.get(materiel.id);
                return (
                  <TableRow key={materiel.id}>
                    <TableCell className="font-medium">{materiel.designation}</TableCell>
                    <TableCell>{ligne?.quantiteTheorique ?? "—"}</TableCell>
                    <TableCell>
                      <LigneComptageForm
                        sessionId={session.id}
                        materielId={materiel.id}
                        quantitePhysiqueInitiale={ligne?.quantitePhysique ?? 0}
                        commentaireInitial={ligne?.commentaire}
                        disabled={estCloturee}
                      />
                    </TableCell>
                    <TableCell>{ligne ? ligne.ecart : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
