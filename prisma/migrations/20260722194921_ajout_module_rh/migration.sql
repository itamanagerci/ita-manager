-- CreateEnum
CREATE TYPE "TypeProfilEmploye" AS ENUM ('AGENT', 'SOUS_TRAITANT', 'OUVRIER');

-- CreateEnum
CREATE TYPE "TypeAbsence" AS ENUM ('CONGE', 'PERMISSION');

-- CreateEnum
CREATE TYPE "StatutAbsence" AS ENUM ('EN_ATTENTE_SUPERIEUR', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TypeMission" AS ENUM ('CHANTIER', 'FORMATION', 'REPRESENTATION_CLIENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutMission" AS ENUM ('EN_ATTENTE_RH', 'VALIDEE_RH', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutReleveActivite" AS ENUM ('SOUMIS', 'VALIDE_RH');

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "superieurId" TEXT;

-- CreateTable
CREATE TABLE "ProfilEmploye" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "typeProfil" "TypeProfilEmploye" NOT NULL,
    "poste" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "dateEntree" TIMESTAMP(3) NOT NULL,
    "soldeConges" INTEGER NOT NULL DEFAULT 0,
    "salaireFixe" DECIMAL(14,2),
    "entrepriseRattachee" TEXT,
    "tauxJournalier" DECIMAL(14,2),

    CONSTRAINT "ProfilEmploye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeAbsence" (
    "id" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "type" "TypeAbsence" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "dureeHeures" INTEGER,
    "motif" TEXT NOT NULL,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE_SUPERIEUR',
    "motifRefus" TEXT,
    "impacteSoldeConges" BOOLEAN NOT NULL,
    "superieurId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeMission" (
    "id" TEXT NOT NULL,
    "employeConcerneId" TEXT NOT NULL,
    "initiateurId" TEXT NOT NULL,
    "typeMission" "TypeMission" NOT NULL,
    "description" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "fraisDeclares" DECIMAL(14,2),
    "motifFrais" TEXT,
    "statut" "StatutMission" NOT NULL DEFAULT 'EN_ATTENTE_RH',
    "motifRefus" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleveActivite" (
    "id" TEXT NOT NULL,
    "ouvrierId" TEXT NOT NULL,
    "projetLibelle" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "joursTravailles" INTEGER NOT NULL,
    "statut" "StatutReleveActivite" NOT NULL DEFAULT 'SOUMIS',
    "saisiParId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleveActivite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfilEmploye_utilisateurId_key" ON "ProfilEmploye"("utilisateurId");

-- CreateIndex
CREATE INDEX "DemandeAbsence_employeId_idx" ON "DemandeAbsence"("employeId");

-- CreateIndex
CREATE INDEX "DemandeAbsence_superieurId_statut_idx" ON "DemandeAbsence"("superieurId", "statut");

-- CreateIndex
CREATE INDEX "DemandeMission_employeConcerneId_idx" ON "DemandeMission"("employeConcerneId");

-- CreateIndex
CREATE INDEX "DemandeMission_statut_idx" ON "DemandeMission"("statut");

-- CreateIndex
CREATE INDEX "ReleveActivite_ouvrierId_idx" ON "ReleveActivite"("ouvrierId");

-- CreateIndex
CREATE INDEX "ReleveActivite_statut_idx" ON "ReleveActivite"("statut");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_superieurId_fkey" FOREIGN KEY ("superieurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilEmploye" ADD CONSTRAINT "ProfilEmploye_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAbsence" ADD CONSTRAINT "DemandeAbsence_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAbsence" ADD CONSTRAINT "DemandeAbsence_superieurId_fkey" FOREIGN KEY ("superieurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMission" ADD CONSTRAINT "DemandeMission_employeConcerneId_fkey" FOREIGN KEY ("employeConcerneId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMission" ADD CONSTRAINT "DemandeMission_initiateurId_fkey" FOREIGN KEY ("initiateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleveActivite" ADD CONSTRAINT "ReleveActivite_ouvrierId_fkey" FOREIGN KEY ("ouvrierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleveActivite" ADD CONSTRAINT "ReleveActivite_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
