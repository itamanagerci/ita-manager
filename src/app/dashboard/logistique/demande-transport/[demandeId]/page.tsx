import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistTransportForm } from "@/components/logistique/checklist-transport-form";

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

interface DemandeTransportDetailPageProps {
  params: Promise<{ demandeId: string }>;
}

export default async function DemandeTransportDetailPage({ params }: DemandeTransportDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  const { demandeId } = await params;

  const [demande, items, estResponsableMagasin] = await Promise.all([
    prisma.demandeTransport.findUnique({
      where: { id: demandeId },
      include: {
        demandeur: { select: { nom: true, prenom: true } },
        vehicule: true,
        visaLogistiquePar: { select: { nom: true, prenom: true } },
        gestionnaireDepart: { select: { nom: true, prenom: true } },
        gestionnaireRetour: { select: { nom: true, prenom: true } },
      },
    }),
    prisma.itemChecklistTransport.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    prisma.magasin.findFirst({ where: { responsableId: utilisateur.id } }),
  ]);
  if (!demande) redirect("/dashboard/logistique/demande-transport");

  const peutTraiter = estResponsableMagasin !== null;
  const estEngin = demande.vehicule?.type === "ENGIN";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`DT-${String(demande.numero).padStart(5, "0")}`}
        description={demande.serviceChantier}
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
          <p>CIA : {demande.cia}</p>
          <p>Description : {demande.description}</p>
          <p>
            Période : {demande.dateDebut.toLocaleDateString("fr-FR")} → {demande.dateFin.toLocaleDateString("fr-FR")}
          </p>
          <p>
            Demandeur : {demande.demandeur.prenom} {demande.demandeur.nom}
          </p>
          {demande.vehicule && <p>Véhicule affecté : {demande.vehicule.immatriculation}</p>}
          {demande.conducteurDepartNom && (
            <p>
              Départ : {demande.conducteurDepartNom} — compteur {demande.compteurDepart} —{" "}
              {demande.dateDepartReelle?.toLocaleDateString("fr-FR")}
            </p>
          )}
          {demande.conducteurRetourNom && (
            <p>
              Retour : {demande.conducteurRetourNom} — compteur {demande.compteurRetour} —{" "}
              {demande.dateRetourReelle?.toLocaleDateString("fr-FR")}
            </p>
          )}
          {demande.motifRefus && <p className="text-status-danger">Motif de refus : {demande.motifRefus}</p>}
        </CardContent>
      </Card>

      {peutTraiter && demande.statut === "VISA_LOGISTIQUE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vérification Départ (Section Garage)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChecklistTransportForm demandeId={demande.id} mode="depart" items={items} estEngin={estEngin} />
          </CardContent>
        </Card>
      )}

      {peutTraiter && demande.statut === "EN_COURS" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vérification Retour (Section Garage)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChecklistTransportForm demandeId={demande.id} mode="retour" items={items} estEngin={estEngin} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
