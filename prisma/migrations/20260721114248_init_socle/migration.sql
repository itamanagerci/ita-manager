-- CreateEnum
CREATE TYPE "NiveauHierarchique" AS ENUM ('DIRECTEUR', 'CHEF_SERVICE', 'AGENT');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('ACTIF', 'INACTIF');

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "icone" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visibleMenu" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SousModule" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SousModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fonction" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Fonction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FonctionModuleDefaut" (
    "id" TEXT NOT NULL,
    "fonctionId" TEXT NOT NULL,
    "sousModuleId" TEXT NOT NULL,
    "activeParDefaut" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FonctionModuleDefaut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "authUserId" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "niveauHierarchique" "NiveauHierarchique" NOT NULL,
    "fonctionId" TEXT NOT NULL,
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'ACTIF',
    "premiereConnexion" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesUtilisateur" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "sousModuleId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL,
    "estException" BOOLEAN NOT NULL DEFAULT false,
    "modifieParId" TEXT,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccesUtilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStatut" (
    "id" TEXT NOT NULL,
    "entiteType" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "statutPrecedent" TEXT,
    "statutNouveau" TEXT NOT NULL,
    "commentaire" TEXT,
    "acteurId" TEXT NOT NULL,
    "dateAction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStatut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_code_key" ON "Module"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SousModule_moduleId_code_key" ON "SousModule"("moduleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Fonction_nom_key" ON "Fonction"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "FonctionModuleDefaut_fonctionId_sousModuleId_key" ON "FonctionModuleDefaut"("fonctionId", "sousModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_authUserId_key" ON "Utilisateur"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccesUtilisateur_utilisateurId_sousModuleId_key" ON "AccesUtilisateur"("utilisateurId", "sousModuleId");

-- CreateIndex
CREATE INDEX "HistoriqueStatut_entiteType_entiteId_idx" ON "HistoriqueStatut"("entiteType", "entiteId");

-- AddForeignKey
ALTER TABLE "SousModule" ADD CONSTRAINT "SousModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FonctionModuleDefaut" ADD CONSTRAINT "FonctionModuleDefaut_fonctionId_fkey" FOREIGN KEY ("fonctionId") REFERENCES "Fonction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FonctionModuleDefaut" ADD CONSTRAINT "FonctionModuleDefaut_sousModuleId_fkey" FOREIGN KEY ("sousModuleId") REFERENCES "SousModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_fonctionId_fkey" FOREIGN KEY ("fonctionId") REFERENCES "Fonction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesUtilisateur" ADD CONSTRAINT "AccesUtilisateur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesUtilisateur" ADD CONSTRAINT "AccesUtilisateur_sousModuleId_fkey" FOREIGN KEY ("sousModuleId") REFERENCES "SousModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesUtilisateur" ADD CONSTRAINT "AccesUtilisateur_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatut" ADD CONSTRAINT "HistoriqueStatut_acteurId_fkey" FOREIGN KEY ("acteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
