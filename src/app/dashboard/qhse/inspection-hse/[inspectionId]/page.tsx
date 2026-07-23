import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirInspectionHSE, ajouterPhotoInspectionHSE } from "@/lib/server-actions/qhse-inspection";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadForm } from "@/components/qhse/photo-upload-form";

interface InspectionHSEDetailPageProps {
  params: Promise<{ inspectionId: string }>;
}

export default async function InspectionHSEDetailPage({ params }: InspectionHSEDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "inspection-hse");

  const { inspectionId } = await params;
  const inspection = await obtenirInspectionHSE(inspectionId);
  if (!inspection) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Inspection HSE — HSE-${String(inspection.numero).padStart(5, "0")}`}
        description={`Responsable : ${inspection.responsableInspection.prenom} ${inspection.responsableInspection.nom}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points contrôlés</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {inspection.reponsesPoints.map((reponse) => {
            const tonalite: Tonalite = reponse.reponse === "NON" ? "danger" : "succes";
            return (
              <div key={reponse.id} className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                <div>
                  <p>{reponse.point.libelle}</p>
                  {reponse.observation && <p className="text-muted-foreground">{reponse.observation}</p>}
                  {reponse.nonConformite && (
                    <p className="text-status-danger">Non-Conformité créée</p>
                  )}
                </div>
                <StatutBadge label={reponse.reponse} tonalite={tonalite} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {inspection.photos.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {inspection.photos.map((photo) => (
                <li key={photo.id}>
                  {photo.urlTelechargement ? (
                    <a href={photo.urlTelechargement} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {photo.nomFichierOriginal}
                    </a>
                  ) : (
                    photo.nomFichierOriginal
                  )}
                </li>
              ))}
            </ul>
          )}
          <PhotoUploadForm entityId={inspection.id} action={ajouterPhotoInspectionHSE} />
        </CardContent>
      </Card>

      {inspection.commentaires && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commentaires</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{inspection.commentaires}</CardContent>
        </Card>
      )}
    </div>
  );
}
