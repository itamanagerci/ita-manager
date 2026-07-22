import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmerReceptionBSMButton } from "@/components/logistique/confirmer-reception-bsm-button";

const LABEL_STATUT: Record<string, string> = {
  EN_ATTENTE_VERIFICATION: "En attente de vérification",
  EN_ATTENTE_DECISION: "En attente de décision",
  APPROUVEE: "Approuvée",
  TRANSFERT_INTER_MAGASIN: "Transfert inter-magasin",
  DEMANDE_ACHAT_DECLENCHEE: "Demande d'achat déclenchée",
  REFUSEE: "Refusée",
};

const TONALITE_STATUT: Record<string, Tonalite> = {
  EN_ATTENTE_VERIFICATION: "attention",
  EN_ATTENTE_DECISION: "attention",
  APPROUVEE: "succes",
  TRANSFERT_INTER_MAGASIN: "succes",
  DEMANDE_ACHAT_DECLENCHEE: "attention",
  REFUSEE: "danger",
};

interface DemandeDetailPageProps {
  params: Promise<{ demandeId: string }>;
}

export default async function DemandeMiseADispositionDetailPage({ params }: DemandeDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const { demandeId } = await params;

  const demande = await prisma.demandeMiseADisposition.findUnique({
    where: { id: demandeId },
    include: {
      magasin: true,
      demandeur: { select: { nom: true, prenom: true } },
      verifiePar: { select: { nom: true, prenom: true } },
      decidePar: { select: { nom: true, prenom: true } },
      lignes: { include: { materiel: { select: { designation: true } } } },
      bonSortie: { include: { preparateur: { select: { nom: true, prenom: true } } } },
    },
  });
  if (!demande) redirect("/dashboard/logistique/flux-sortie");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`DMS-${String(demande.numero).padStart(5, "0")}`}
        description={`${demande.magasin.code} — ${demande.magasin.nom}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demande</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            Statut :{" "}
            <StatutBadge label={LABEL_STATUT[demande.statut]} tonalite={TONALITE_STATUT[demande.statut]} />
          </p>
          <p>Chantier/service : {demande.chantierService}</p>
          <p>Urgence : {demande.urgence === "URGENT" ? "Urgent" : "Normal"}</p>
          {demande.justificationUrgence && <p>Justification : {demande.justificationUrgence}</p>}
          <p>
            Demandeur : {demande.demandeur.prenom} {demande.demandeur.nom} — {demande.demandeurPoste} —{" "}
            {demande.demandeurTelephone}
          </p>
          {demande.verifiePar && (
            <p>
              Vérifié par {demande.verifiePar.prenom} {demande.verifiePar.nom} ({demande.verificationStatut})
              {demande.verificationObservations && ` — ${demande.verificationObservations}`}
            </p>
          )}
          {demande.decidePar && (
            <p>
              Décidé par {demande.decidePar.prenom} {demande.decidePar.nom}
              {demande.motifRefus && ` — Motif : ${demande.motifRefus}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Articles demandés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demande.lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell>{ligne.materiel.designation}</TableCell>
                  <TableCell>{ligne.quantiteDemandee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {demande.bonSortie && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Bon de Sortie Magasin BSM-{String(demande.bonSortie.numero).padStart(5, "0")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>Destinataire/chantier : {demande.bonSortie.destinataireChantier}</p>
            {demande.bonSortie.preparateur && (
              <p>
                Préparé par {demande.bonSortie.preparateur.prenom} {demande.bonSortie.preparateur.nom}
              </p>
            )}
            <p>
              Statut :{" "}
              {demande.bonSortie.statut === "RECU" ? (
                <StatutBadge label="Reçu" tonalite="succes" />
              ) : (
                <StatutBadge label="Émis" tonalite="attention" />
              )}
            </p>
            {demande.bonSortie.statut === "EMIS" && demande.demandeurId === utilisateur.id && (
              <ConfirmerReceptionBSMButton bsmId={demande.bonSortie.id} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
