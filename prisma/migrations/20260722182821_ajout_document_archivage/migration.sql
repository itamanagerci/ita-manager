-- CreateEnum
CREATE TYPE "CategorieDocument" AS ENUM ('CONTRATS', 'RH', 'JURIDIQUE', 'FACTURES', 'QHSE', 'ACHAT', 'TECHNIQUE', 'AUTRE');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,
    "categorie" "CategorieDocument" NOT NULL,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ajouteParId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_categorie_idx" ON "Document"("categorie");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
