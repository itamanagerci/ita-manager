import Link from "next/link";
import {
  listerDemandesTransport,
  listerAViserLogistique,
  listerAGererGarage,
} from "@/lib/server-actions/demande-transport";
import { getCurrentUtilisateur, possedeAccesSousModule } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemandeTransportForm } from "@/components/logistique/demande-transport-form";
import { VisaLogistiqueActions } from "@/components/logistique/visa-logistique-actions";

const LABEL_STATUT: Record<string, string> = {
  SOUMIS: "Soumis",
  VISA_LOGISTIQUE: "Visa Logistique",
  VERIFIE_DEPART: "Vérifié (Départ)",
  EN_COURS: "En cours d'utilisation",
  VERIFIE_RETOUR: "Vérifié (Retour)",
  ARCHIVE: "Archivé",
  REFUSE: "Refusé",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  SOUMIS: "attention",
  VISA_LOGISTIQUE: "attention",
  VERIFIE_DEPART: "attention",
  EN_COURS: "info",
  VERIFIE_RETOUR: "attention",
  ARCHIVE: "succes",
  REFUSE: "danger",
};

export default async function DemandeTransportPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");
  await requireAccesModule(utilisateur.id, "logistique", "demande-transport");

  const peutViser = await possedeAccesSousModule(utilisateur.id, "logistique", "magasins");

  const [demandes, aViser, { aDepart, aRetour }, vehicules] = await Promise.all([
    listerDemandesTransport(),
    listerAViserLogistique(),
    listerAGererGarage(),
    prisma.vehicule.findMany({
      where: { etat: "OK", dateSortieDefinitive: null },
      select: { id: true, immatriculation: true },
      orderBy: { immatriculation: "asc" },
    }),
  ]);

  const estResponsableMagasin = await prisma.magasin.findFirst({ where: { responsableId: utilisateur.id } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demande de Transport"
        description="Transport-Transfert ou Mise à disposition d'un véhicule/engin."
        actions={<DemandeTransportForm />}
      />

      {peutViser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À viser (Logistique)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {aViser.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Rien à viser" bordered={false} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Service/chantier</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead className="w-64" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aViser.map((demande) => (
                    <TableRow key={demande.id}>
                      <TableCell className="font-medium">DT-{String(demande.numero).padStart(5, "0")}</TableCell>
                      <TableCell>{demande.serviceChantier}</TableCell>
                      <TableCell>
                        {demande.demandeur.prenom} {demande.demandeur.nom}
                      </TableCell>
                      <TableCell>
                        <VisaLogistiqueActions demandeId={demande.id} vehicules={vehicules} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {estResponsableMagasin && (aDepart.length > 0 || aRetour.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À gérer (Garage)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...aDepart, ...aRetour].map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">DT-{String(demande.numero).padStart(5, "0")}</TableCell>
                    <TableCell>{demande.vehicule?.immatriculation ?? "—"}</TableCell>
                    <TableCell>{demande.statut === "VISA_LOGISTIQUE" ? "Départ" : "Retour"}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/logistique/demande-transport/${demande.id}`}>Traiter</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {demandes.length === 0 ? (
        <EmptyState title="Aucune demande de transport" description="Les demandes soumises apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Service/chantier</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandes.map((demande) => (
                  <TableRow key={demande.id}>
                    <TableCell className="font-medium">DT-{String(demande.numero).padStart(5, "0")}</TableCell>
                    <TableCell>{demande.serviceChantier}</TableCell>
                    <TableCell>
                      {demande.demandeur.prenom} {demande.demandeur.nom}
                    </TableCell>
                    <TableCell>{demande.vehicule?.immatriculation ?? "—"}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_STATUT[demande.statut]}
                        tonalite={TONALITE_STATUT[demande.statut]}
                      />
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/logistique/demande-transport/${demande.id}`}>Détail</Link>
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
