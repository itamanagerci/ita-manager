import type { CategorieDocument } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import {
  categoriesAutoriseesPourUtilisateurCourant,
  listerDocuments,
} from "@/lib/server-actions/documents";
import { LABEL_CATEGORIE, TONALITE_CATEGORIE } from "@/lib/categories-document";
import { PageHeader } from "@/components/ui/composed/page-header";
import { StatutBadge } from "@/components/ui/composed/statut-badge";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AjouterDocumentForm } from "@/components/gestion-documents/ajouter-document-form";

interface ArchivageDocumentairePageProps {
  searchParams: Promise<{ categorie?: string; q?: string }>;
}

export default async function ArchivageDocumentairePage({
  searchParams,
}: ArchivageDocumentairePageProps) {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "assistant-direction", "archivage-documentaire");

  const { categorie: categorieFiltre, q: recherche } = await searchParams;
  const categoriesAutorisees = await categoriesAutoriseesPourUtilisateurCourant();

  const documents = await listerDocuments({
    categorie: categorieFiltre as CategorieDocument | undefined,
    recherche,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Archivage documentaire"
        description="Documents partagés par catégorie."
        actions={<AjouterDocumentForm categoriesAutorisees={categoriesAutorisees} />}
      />

      <form method="GET" className="flex items-center gap-2">
        <NativeSelect
          name="categorie"
          defaultValue={categorieFiltre ?? ""}
          className="w-auto"
        >
          <option value="">Toutes les catégories</option>
          {categoriesAutorisees.map((categorie) => (
            <option key={categorie} value={categorie}>
              {LABEL_CATEGORIE[categorie]}
            </option>
          ))}
        </NativeSelect>
        <Input name="q" defaultValue={recherche ?? ""} placeholder="Rechercher un titre..." className="w-64" />
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      {documents.length === 0 ? (
        <EmptyState
          title="Aucun document archivé"
          description="Ajoutez le premier document avec le bouton ci-dessus."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Date d&apos;ajout</TableHead>
                  <TableHead>Ajouté par</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.titre}</TableCell>
                    <TableCell>
                      <StatutBadge
                        label={LABEL_CATEGORIE[document.categorie]}
                        tonalite={TONALITE_CATEGORIE[document.categorie]}
                      />
                    </TableCell>
                    <TableCell>{document.dateAjout.toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {document.ajoutePar
                        ? `${document.ajoutePar.prenom} ${document.ajoutePar.nom}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {document.urlTelechargement && (
                        <a
                          href={document.urlTelechargement}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          Télécharger
                        </a>
                      )}
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
