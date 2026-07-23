import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { obtenirRapportIncident, ajouterPhotoRapportIncident } from "@/lib/server-actions/qhse-rapport-incident";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadForm } from "@/components/qhse/photo-upload-form";

const LABEL_TYPE: Record<string, string> = {
  ACCIDENT: "Accident",
  INCIDENT: "Incident",
  PRESQU_ACCIDENT: "Presqu'accident",
};

interface RapportIncidentDetailPageProps {
  params: Promise<{ rapportId: string }>;
}

export default async function RapportIncidentDetailPage({ params }: RapportIncidentDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "rapport-incident");

  const { rapportId } = await params;
  const rapport = await obtenirRapportIncident(rapportId);
  if (!rapport) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Rapport ${LABEL_TYPE[rapport.typeNotification]} — RI-${String(rapport.numero).padStart(5, "0")}`}
        description={`Reporté par ${rapport.reportePar.prenom} ${rapport.reportePar.nom} le ${rapport.dateEvenement.toLocaleDateString("fr-FR")}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résumé de l&apos;événement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{rapport.resumeEvenement}</p>
          <p className="text-muted-foreground">Activités : {rapport.activite.join(", ") || "—"}</p>
          <p className="text-muted-foreground">Dommages : {rapport.descriptionDommages.join(", ") || "—"}</p>
        </CardContent>
      </Card>

      {rapport.personnesImpliquees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Victimes et témoins</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {rapport.personnesImpliquees.map((personne) => (
              <p key={personne.id}>
                [{personne.role}] {personne.nom} — {personne.fonction ?? "—"}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {rapport.nonConformite && (
        <Card className="border-status-danger">
          <CardContent className="pt-6 text-sm">
            <span className="font-semibold">Non-Conformité créée : </span>
            {rapport.nonConformite.descriptionNonConformite}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rapport.photos.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {rapport.photos.map((photo) => (
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
          <PhotoUploadForm entityId={rapport.id} action={ajouterPhotoRapportIncident} />
        </CardContent>
      </Card>
    </div>
  );
}
