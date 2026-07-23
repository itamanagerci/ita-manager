import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  obtenirDemandeAchatPourTraitement,
  listerPiecesJointesDevis,
} from "@/lib/server-actions/achat-traitement";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TraitementAchatForm } from "@/components/achat/traitement-achat-form";
import { DevisUploadForm } from "@/components/achat/devis-upload-form";

interface TraitementAchatDetailPageProps {
  params: Promise<{ demandeId: string }>;
}

export default async function TraitementAchatDetailPage({
  params,
}: TraitementAchatDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "achat", "traitement-achat");

  const { demandeId } = await params;
  const [demande, piecesJointes] = await Promise.all([
    obtenirDemandeAchatPourTraitement(demandeId),
    listerPiecesJointesDevis(demandeId),
  ]);
  if (!demande) notFound();

  const estResoumission = demande.statut === "REFUSEE" && demande.etapeBlocage === "VALIDATION_PARALLELE";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Traitement — ACH-${String(demande.numero).padStart(5, "0")}`}
        description={`Demandeur : ${demande.demandeur.prenom} ${demande.demandeur.nom} — Justification : ${demande.justification}`}
      />

      {estResoumission && demande.motifRefus && (
        <Card className="border-status-danger">
          <CardContent className="pt-6 text-sm">
            <span className="font-semibold">Refusée par un validateur : </span>
            {demande.motifRefus}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {piecesJointes.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {piecesJointes.map((piece) => (
                <li key={piece.id}>
                  {piece.urlTelechargement ? (
                    <a
                      href={piece.urlTelechargement}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {piece.nomFichierOriginal}
                    </a>
                  ) : (
                    piece.nomFichierOriginal
                  )}
                </li>
              ))}
            </ul>
          )}
          <DevisUploadForm demandeId={demande.id} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <TraitementAchatForm
            demandeId={demande.id}
            lignes={demande.lignes}
            estResoumission={estResoumission}
          />
        </CardContent>
      </Card>
    </div>
  );
}
