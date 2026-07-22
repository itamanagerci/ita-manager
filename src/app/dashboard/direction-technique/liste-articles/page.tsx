import { redirect } from "next/navigation";
import { getCurrentUtilisateur } from "@/lib/server-actions/acces";
import { requireAccesModule } from "@/lib/server-actions/guards";
import { listerArticles } from "@/lib/server-actions/liste-articles";
import { PageHeader } from "@/components/ui/composed/page-header";
import { EmptyState } from "@/components/ui/composed/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArticleForm } from "@/components/direction-technique/article-form";

export default async function ListeArticlesPage() {
  const utilisateur = await getCurrentUtilisateur();
  if (!utilisateur) redirect("/login");

  await requireAccesModule(utilisateur.id, "direction-technique", "liste-articles");

  const articles = await listerArticles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Liste des articles"
        description="Référentiel partagé avec le futur module Achat."
        actions={<ArticleForm />}
      />

      {articles.length === 0 ? (
        <EmptyState title="Aucun article" description="Ajoutez le premier article avec le bouton ci-dessus." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Prix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.designation}</TableCell>
                    <TableCell>{article.fournisseur ?? "—"}</TableCell>
                    <TableCell>
                      {article.prix ? `${Number(article.prix).toLocaleString("fr-FR")} FCFA` : "—"}
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
