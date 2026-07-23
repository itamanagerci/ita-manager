import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerSuiviDemandesAchat, type SuiviDemandeAchat } from "@/lib/server-actions/achat-suivi";
import { LABEL_ROLE } from "@/lib/achat-constants";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function libelleLigne(ligne: { designationLibre: string | null; article: { designation: string } | null }) {
  return ligne.article?.designation ?? ligne.designationLibre ?? "—";
}

function formatDate(date: Date | null | undefined): string {
  return date ? date.toLocaleDateString("fr-FR") : "—";
}

interface EtapeSuivi {
  libelle: string;
  tonalite: Tonalite;
  detail: string;
}

function construireEtapes(demande: SuiviDemandeAchat): EtapeSuivi[] {
  const refuseeDirecteur = demande.statut === "REFUSEE" && demande.etapeBlocage === "DIRECTEUR";
  const refuseeParallele = demande.statut === "REFUSEE" && demande.etapeBlocage === "VALIDATION_PARALLELE";
  const apresDirecteur =
    demande.dateValidationDirecteur != null || demande.statut === "EN_ATTENTE_TRAITEMENT_ACHAT" || demande.statut === "EN_ATTENTE_VALIDATION_PARALLELE" || demande.statut === "BC_EMIS" || refuseeParallele;

  const bonsDeCommandeUniques = Array.from(
    new Map(
      demande.lignes
        .map((ligne) => ligne.ligneBC?.bonDeCommande)
        .filter((bc): bc is NonNullable<typeof bc> => bc != null)
        .map((bc) => [bc.id, bc]),
    ).values(),
  );
  const bemAssocies = bonsDeCommandeUniques.flatMap((bc) => bc.bonsEntreeMagasin);

  return [
    {
      libelle: "1. Soumis",
      tonalite: "succes",
      detail: `Le ${formatDate(demande.dateCreation)} par ${demande.demandeur.prenom} ${demande.demandeur.nom}`,
    },
    {
      libelle: "2. Validation département",
      tonalite: refuseeDirecteur ? "danger" : demande.dateValidationDirecteur ? "succes" : "attention",
      detail: refuseeDirecteur
        ? `Refusée par ${demande.directeurDepartement.prenom} ${demande.directeurDepartement.nom} — ${demande.motifRefus ?? ""}`
        : demande.dateValidationDirecteur
          ? `Validée le ${formatDate(demande.dateValidationDirecteur)} par ${demande.directeurDepartement.prenom} ${demande.directeurDepartement.nom}`
          : `En attente de ${demande.directeurDepartement.prenom} ${demande.directeurDepartement.nom}`,
    },
    {
      libelle: "3. Traitement Achat",
      tonalite: demande.dateTraitement ? "succes" : "attention",
      detail: demande.dateTraitement
        ? `Traitée le ${formatDate(demande.dateTraitement)} par ${demande.traitePar?.prenom ?? ""} ${demande.traitePar?.nom ?? ""}`
        : "En attente de traitement",
    },
    {
      libelle: "4. Validation parallèle",
      tonalite: demande.urgent
        ? "neutre"
        : refuseeParallele
          ? "danger"
          : demande.validations.length > 0 && demande.validations.every((v) => v.statut === "VALIDEE")
            ? "succes"
            : "attention",
      detail: demande.urgent
        ? "Non applicable — demande urgente, Bon de Commande émis directement"
        : !apresDirecteur
          ? "—"
          : demande.validations.length === 0
            ? "Rôles non encore sélectionnés"
            : demande.validations
                .map(
                  (v) =>
                    `${LABEL_ROLE[v.role]} : ${v.statut}${v.dateAction ? ` (${formatDate(v.dateAction)})` : ""}`,
                )
                .join(" · "),
    },
    {
      libelle: "5. Bon de Commande émis",
      tonalite: demande.statut === "BC_EMIS" ? "succes" : "attention",
      detail:
        bonsDeCommandeUniques.length > 0
          ? bonsDeCommandeUniques.map((bc) => `BC-${String(bc.numero).padStart(5, "0")}`).join(", ")
          : "—",
    },
    {
      libelle: "6. Réception Logistique",
      tonalite: bemAssocies.length > 0 ? "succes" : "neutre",
      detail:
        bemAssocies.length > 0
          ? bemAssocies
              .map((bem) => `BEM-${String(bem.numero).padStart(5, "0")} (${formatDate(bem.dateReception)})`)
              .join(", ")
          : "Pas encore de réception enregistrée",
    },
    {
      libelle: "7. Facturation DFC",
      tonalite: "neutre",
      detail: "En attente du module DFC (Lot 8)",
    },
  ];
}

export default async function SuiviDemandesAchatPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "achat", "suivi-demandes");

  const demandes = await listerSuiviDemandesAchat();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Suivi des demandes"
        description="Vue d'ensemble en lecture seule du circuit complet, en 7 étapes."
      />

      {demandes.length === 0 ? (
        <EmptyState title="Aucune demande" description="Les demandes d'achat apparaîtront ici." />
      ) : (
        <Card>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {demandes.map((demande) => (
                <AccordionItem key={demande.id} value={demande.id}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between pr-4">
                      <span className="font-medium">
                        ACH-{String(demande.numero).padStart(5, "0")} —{" "}
                        {demande.demandeur.prenom} {demande.demandeur.nom} —{" "}
                        {demande.lignes.map(libelleLigne).join(", ")}
                      </span>
                      <StatutBadge
                        label={demande.statut}
                        tonalite={demande.statut === "BC_EMIS" ? "succes" : demande.statut === "REFUSEE" ? "danger" : "attention"}
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col gap-2">
                      {construireEtapes(demande).map((etape) => (
                        <li key={etape.libelle} className="flex items-start gap-3">
                          <StatutBadge label={etape.libelle} tonalite={etape.tonalite} />
                          <span className="text-sm text-muted-foreground">{etape.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
