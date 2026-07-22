/*
  Warnings:

  - You are about to drop the column `projetLibelle` on the `ReleveActivite` table. All the data in the column will be lost.
  - Added the required column `projetId` to the `ReleveActivite` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatutAppelOffres" AS ENUM ('EN_ATTENTE_DG', 'VALIDE', 'REFUSE');

-- CreateEnum
CREATE TYPE "StatutPointValidation" AS ENUM ('A_FAIRE', 'FAIT');

-- CreateEnum
CREATE TYPE "StatutLigneDemandeRH" AS ENUM ('EN_ATTENTE_RH', 'CONTRE_PROPOSEE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutDemandeMateriel" AS ENUM ('EN_ATTENTE_LOGISTIQUE', 'VALIDEE', 'REFUSEE');

-- AlterTable
ALTER TABLE "ReleveActivite" DROP COLUMN "projetLibelle",
ADD COLUMN     "projetId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "DemandeAppelOffres" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "montantEstime" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "delaiReponse" TIMESTAMP(3) NOT NULL,
    "initiateurId" TEXT NOT NULL,
    "statut" "StatutAppelOffres" NOT NULL DEFAULT 'EN_ATTENTE_DG',
    "motifRefus" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAppelOffres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointeAppelOffres" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,

    CONSTRAINT "PieceJointeAppelOffres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "chefProjetId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointValidation" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "echeance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPointValidation" NOT NULL DEFAULT 'A_FAIRE',
    "cochePar" TEXT,
    "dateValidation" TIMESTAMP(3),

    CONSTRAINT "PointValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "lienDetail" TEXT,
    "entiteType" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeRHProjet" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "initiateurId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeRHProjet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDemandeRHProjet" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "tauxJournalierPropose" DECIMAL(14,2) NOT NULL,
    "statut" "StatutLigneDemandeRH" NOT NULL DEFAULT 'EN_ATTENTE_RH',
    "motifRefus" TEXT,
    "ouvrierContreProposeId" TEXT,
    "competenceContreProposee" TEXT,
    "tauxJournalierContrePropose" DECIMAL(14,2),
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LigneDemandeRHProjet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationProjet" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "ouvrierId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "tauxJournalier" DECIMAL(14,2) NOT NULL,
    "ligneDemandeId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffectationProjet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materiel" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Materiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeMateriel" (
    "id" TEXT NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "materielId" TEXT NOT NULL,
    "delaiSouhaite" TIMESTAMP(3) NOT NULL,
    "initiateurId" TEXT NOT NULL,
    "statut" "StatutDemandeMateriel" NOT NULL DEFAULT 'EN_ATTENTE_LOGISTIQUE',
    "motifRefus" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeMateriel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "fournisseur" TEXT,
    "prix" DECIMAL(14,2),
    "creeParId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeAppelOffres_statut_idx" ON "DemandeAppelOffres"("statut");

-- CreateIndex
CREATE INDEX "DemandeAppelOffres_initiateurId_idx" ON "DemandeAppelOffres"("initiateurId");

-- CreateIndex
CREATE INDEX "Projet_chefProjetId_idx" ON "Projet"("chefProjetId");

-- CreateIndex
CREATE INDEX "PointValidation_projetId_idx" ON "PointValidation"("projetId");

-- CreateIndex
CREATE INDEX "PointValidation_statut_echeance_idx" ON "PointValidation"("statut", "echeance");

-- CreateIndex
CREATE INDEX "Notification_destinataireId_lu_idx" ON "Notification"("destinataireId", "lu");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_destinataireId_entiteType_entiteId_key" ON "Notification"("destinataireId", "entiteType", "entiteId");

-- CreateIndex
CREATE INDEX "DemandeRHProjet_projetId_idx" ON "DemandeRHProjet"("projetId");

-- CreateIndex
CREATE INDEX "LigneDemandeRHProjet_demandeId_idx" ON "LigneDemandeRHProjet"("demandeId");

-- CreateIndex
CREATE INDEX "LigneDemandeRHProjet_statut_idx" ON "LigneDemandeRHProjet"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "AffectationProjet_ligneDemandeId_key" ON "AffectationProjet"("ligneDemandeId");

-- CreateIndex
CREATE INDEX "AffectationProjet_ouvrierId_projetId_idx" ON "AffectationProjet"("ouvrierId", "projetId");

-- CreateIndex
CREATE INDEX "DemandeMateriel_projetId_idx" ON "DemandeMateriel"("projetId");

-- CreateIndex
CREATE INDEX "DemandeMateriel_statut_idx" ON "DemandeMateriel"("statut");

-- CreateIndex
CREATE INDEX "ReleveActivite_projetId_idx" ON "ReleveActivite"("projetId");

-- AddForeignKey
ALTER TABLE "ReleveActivite" ADD CONSTRAINT "ReleveActivite_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAppelOffres" ADD CONSTRAINT "DemandeAppelOffres_initiateurId_fkey" FOREIGN KEY ("initiateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointeAppelOffres" ADD CONSTRAINT "PieceJointeAppelOffres_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeAppelOffres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projet" ADD CONSTRAINT "Projet_chefProjetId_fkey" FOREIGN KEY ("chefProjetId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointValidation" ADD CONSTRAINT "PointValidation_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointValidation" ADD CONSTRAINT "PointValidation_cochePar_fkey" FOREIGN KEY ("cochePar") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRHProjet" ADD CONSTRAINT "DemandeRHProjet_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRHProjet" ADD CONSTRAINT "DemandeRHProjet_initiateurId_fkey" FOREIGN KEY ("initiateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeRHProjet" ADD CONSTRAINT "LigneDemandeRHProjet_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeRHProjet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeRHProjet" ADD CONSTRAINT "LigneDemandeRHProjet_ouvrierContreProposeId_fkey" FOREIGN KEY ("ouvrierContreProposeId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationProjet" ADD CONSTRAINT "AffectationProjet_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationProjet" ADD CONSTRAINT "AffectationProjet_ouvrierId_fkey" FOREIGN KEY ("ouvrierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationProjet" ADD CONSTRAINT "AffectationProjet_ligneDemandeId_fkey" FOREIGN KEY ("ligneDemandeId") REFERENCES "LigneDemandeRHProjet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMateriel" ADD CONSTRAINT "DemandeMateriel_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMateriel" ADD CONSTRAINT "DemandeMateriel_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMateriel" ADD CONSTRAINT "DemandeMateriel_initiateurId_fkey" FOREIGN KEY ("initiateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
