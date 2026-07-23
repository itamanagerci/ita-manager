import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirAccueilSecurite } from "@/lib/server-actions/qhse-accueil-securite";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { AccueilSecuriteForm } from "@/components/qhse/accueil-securite-form";

const LABEL_STATUT: Record<string, string> = { EN_ATTENTE: "En attente", EFFECTUE: "Effectué" };
const TONALITE_STATUT: Record<string, Tonalite> = { EN_ATTENTE: "attention", EFFECTUE: "succes" };

interface AccueilSecuriteDetailPageProps {
  params: Promise<{ accueilId: string }>;
}

export default async function AccueilSecuriteDetailPage({ params }: AccueilSecuriteDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "accueil-securite");

  const { accueilId } = await params;
  const accueil = await obtenirAccueilSecurite(accueilId);
  if (!accueil) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Accueil Sécurité — ${accueil.utilisateur.prenom} ${accueil.utilisateur.nom}`}
        description={`Fonction : ${accueil.utilisateur.fonction.nom}`}
        actions={<StatutBadge label={LABEL_STATUT[accueil.statut]} tonalite={TONALITE_STATUT[accueil.statut]} />}
      />

      {accueil.statut === "EN_ATTENTE" ? (
        <Card>
          <CardContent className="pt-6">
            <AccueilSecuriteForm accueilId={accueil.id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm">
            <div>
              <p className="font-semibold">Statut travailleur</p>
              <p className="text-muted-foreground">{accueil.statutTravailleur ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Âge</p>
              <p className="text-muted-foreground">{accueil.age ?? "—"}</p>
            </div>
            <div>
              <p className="font-semibold">EPI reçus</p>
              <p className="text-muted-foreground">{accueil.epiRecus.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="font-semibold">Complété par</p>
              <p className="text-muted-foreground">
                {accueil.responsableAccueil
                  ? `${accueil.responsableAccueil.prenom} ${accueil.responsableAccueil.nom}`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
