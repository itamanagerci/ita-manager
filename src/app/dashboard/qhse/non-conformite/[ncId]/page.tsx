import { notFound, redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  obtenirNonConformite,
  ajouterPhotoNonConformite,
  peutCloturerNonConformite,
} from "@/lib/server-actions/qhse-non-conformite";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge, type Tonalite } from "@/components/ui/composed/statut-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadForm } from "@/components/qhse/photo-upload-form";
import { PlanActionNonConformiteForm } from "@/components/qhse/plan-action-non-conformite-form";
import { ClotureNonConformiteActions } from "@/components/qhse/cloture-non-conformite-actions";

const LABEL_STATUT: Record<string, string> = { OUVERTE: "Ouverte", CLOTUREE: "Clôturée" };
const TONALITE_STATUT: Record<string, Tonalite> = { OUVERTE: "attention", CLOTUREE: "succes" };

interface NonConformiteDetailPageProps {
  params: Promise<{ ncId: string }>;
}

export default async function NonConformiteDetailPage({ params }: NonConformiteDetailPageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "qhse", "non-conformite");

  const { ncId } = await params;
  const [nonConformite, peutCloturer] = await Promise.all([
    obtenirNonConformite(ncId),
    peutCloturerNonConformite(utilisateur.id),
  ]);
  if (!nonConformite) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fiche de Non-Conformité"
        description={`Identifiée par ${nonConformite.identificateur.prenom} ${nonConformite.identificateur.nom}`}
        actions={
          <StatutBadge label={LABEL_STATUT[nonConformite.statut]} tonalite={TONALITE_STATUT[nonConformite.statut]} />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{nonConformite.descriptionNonConformite}</p>
          <p className="text-muted-foreground">Type : {nonConformite.typeNonConformite}</p>
          {nonConformite.processus && <p className="text-muted-foreground">Processus : {nonConformite.processus}</p>}
          {nonConformite.preuveDescription && (
            <p className="text-muted-foreground">Preuve : {nonConformite.preuveDescription}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan d&apos;action</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanActionNonConformiteForm
            nonConformiteId={nonConformite.id}
            valeursInitiales={{
              correctionContenu: nonConformite.correctionContenu,
              correctionDelai: nonConformite.correctionDelai,
              analyseCausesContenu: nonConformite.analyseCausesContenu,
              analyseCausesDelai: nonConformite.analyseCausesDelai,
              actionsCorrectivesContenu: nonConformite.actionsCorrectivesContenu,
              actionsCorrectivesDelai: nonConformite.actionsCorrectivesDelai,
              dateAchevement: nonConformite.dateAchevement,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {nonConformite.photos.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {nonConformite.photos.map((photo) => (
                <li key={photo.id}>{photo.nomFichierOriginal}</li>
              ))}
            </ul>
          )}
          <PhotoUploadForm entityId={nonConformite.id} action={ajouterPhotoNonConformite} />
        </CardContent>
      </Card>

      {nonConformite.statut === "OUVERTE" && peutCloturer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clôture de la non-conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <ClotureNonConformiteActions nonConformiteId={nonConformite.id} />
          </CardContent>
        </Card>
      )}

      {nonConformite.statut === "CLOTUREE" && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <span className="font-semibold">Décision : </span>
            {nonConformite.decisionCloture} — {nonConformite.responsableQHSE?.prenom} {nonConformite.responsableQHSE?.nom}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
