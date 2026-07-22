import Link from "next/link";
import { listerSessionsInventaire } from "@/lib/server-actions/inventaire-periodique";
import { listerMagasins } from "@/lib/server-actions/fiche-inventaire";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionInventaireForm } from "@/components/logistique/session-inventaire-form";

const LABEL_TYPE: Record<string, string> = {
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  SEMESTRIEL: "Semestriel",
  ANNUEL: "Annuel",
  EXCEPTIONNEL: "Exceptionnel",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_COURS: "attention",
  CLOTUREE: "succes",
};

const LABEL_STATUT: Record<string, string> = {
  EN_COURS: "En cours",
  CLOTUREE: "Clôturée",
};

export default async function InventairePeriodiquePage() {
  const [sessions, magasins] = await Promise.all([listerSessionsInventaire(), listerMagasins()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventaire Périodique"
        description="Fiches de Comptage (FIC) par magasin."
        actions={<SessionInventaireForm magasins={magasins} />}
      />

      {sessions.length === 0 ? (
        <EmptyState title="Aucune session" description="Créez la première session avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Équipe</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      FIC-{String(session.numero).padStart(5, "0")}
                    </TableCell>
                    <TableCell>{LABEL_TYPE[session.type]}</TableCell>
                    <TableCell>{session.magasin.code}</TableCell>
                    <TableCell>{session.equipeComptage ?? "—"}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[session.statut]}
                        tonalite={TONALITE_STATUT[session.statut]}
                      />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/logistique/inventaire-periodique/${session.id}`}>
                          Voir le détail
                        </Link>
                      </Button>
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
