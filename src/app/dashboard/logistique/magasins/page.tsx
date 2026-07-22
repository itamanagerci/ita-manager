import { obtenirResumeMagasins } from "@/lib/server-actions/magasins";
import { PageHeader } from "@/components/ui/composed/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatutBadge } from "@/components/ui/composed/statut-badge";

export default async function MagasinsPage() {
  const resumes = await obtenirResumeMagasins();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Magasins" description="Vue d'ensemble des 4 magasins du Service Logistique." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resumes.map(({ magasin, articlesSuivis, alertesActives, dmsEnAttente, bemEnAttente }) => (
          <Card key={magasin.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {magasin.code} — {magasin.nom}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p className="text-muted-foreground">
                Chef Magasin :{" "}
                {magasin.responsable
                  ? `${magasin.responsable.prenom} ${magasin.responsable.nom}`
                  : "Non désigné"}
              </p>
              <p>{articlesSuivis} articles suivis</p>
              <div className="flex items-center gap-2">
                {alertesActives > 0 ? (
                  <StatutBadge label={`${alertesActives} alerte(s) seuil`} tonalite="danger" />
                ) : (
                  <StatutBadge label="Aucune alerte" tonalite="succes" />
                )}
              </div>
              {dmsEnAttente > 0 && (
                <StatutBadge label={`${dmsEnAttente} DMS en attente`} tonalite="attention" />
              )}
              {bemEnAttente > 0 && (
                <StatutBadge label={`${bemEnAttente} BEM en attente`} tonalite="attention" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
