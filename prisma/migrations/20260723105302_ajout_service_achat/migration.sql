-- CreateEnum
CREATE TYPE "ForTypeDemandeAchat" AS ENUM ('SERVICE', 'CHANTIER');

-- CreateEnum
CREATE TYPE "TypeDemandeAchat" AS ENUM ('INITIALE', 'REGULARISATION');

-- CreateEnum
CREATE TYPE "StatutDemandeAchat" AS ENUM ('EN_ATTENTE_DIRECTEUR', 'EN_ATTENTE_TRAITEMENT_ACHAT', 'EN_ATTENTE_VALIDATION_PARALLELE', 'REFUSEE', 'BC_EMIS');

-- CreateEnum
CREATE TYPE "EtapeBlocageDemandeAchat" AS ENUM ('DIRECTEUR', 'VALIDATION_PARALLELE');

-- CreateEnum
CREATE TYPE "TypePaiementAchat" AS ENUM ('CHEQUE', 'VIREMENT', 'ESPECES', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "ModeTarificationLigneAchat" AS ENUM ('FORFAITAIRE', 'CALCULE');

-- CreateEnum
CREATE TYPE "RoleValidationAchat" AS ENUM ('DT', 'RH', 'DFC', 'DG');

-- CreateEnum
CREATE TYPE "StatutValidationDemandeAchat" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutBonDeCommande" AS ENUM ('OUVERT', 'ENVOYE');

-- AlterTable
ALTER TABLE "BonEntreeMagasin" ADD COLUMN     "bonDeCommandeId" TEXT;

-- CreateTable
CREATE TABLE "DemandeAchat" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "forType" "ForTypeDemandeAchat" NOT NULL,
    "forServiceModuleCode" TEXT,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "lieuLivraisonProjetId" TEXT,
    "lieuLivraisonLibre" TEXT,
    "dateLivraisonSouhaitee" TIMESTAMP(3) NOT NULL,
    "type" "TypeDemandeAchat" NOT NULL DEFAULT 'INITIALE',
    "demandeurId" TEXT NOT NULL,
    "emetteurId" TEXT NOT NULL,
    "creeParId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "statut" "StatutDemandeAchat" NOT NULL DEFAULT 'EN_ATTENTE_DIRECTEUR',
    "motifRefus" TEXT,
    "etapeBlocage" "EtapeBlocageDemandeAchat",
    "directeurDepartementId" TEXT NOT NULL,
    "dateValidationDirecteur" TIMESTAMP(3),
    "traiteParId" TEXT,
    "dateTraitement" TIMESTAMP(3),
    "dateLivraisonPrevue" TIMESTAMP(3),
    "tauxTva" DECIMAL(5,2),
    "typePaiement" "TypePaiementAchat",
    "echeancePaiementJours" INTEGER,
    "montantTotalTTC" DECIMAL(14,2),
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "seuilUrgenceApplique" DECIMAL(14,2),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeAchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDemandeAchat" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "articleId" TEXT,
    "designationLibre" TEXT,
    "quantite" INTEGER NOT NULL,
    "fournisseur" TEXT,
    "modeTarification" "ModeTarificationLigneAchat",
    "prixUnitaire" DECIMAL(14,2),
    "montantForfaitaire" DECIMAL(14,2),
    "montantLigneHT" DECIMAL(14,2),

    CONSTRAINT "LigneDemandeAchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationDemandeAchat" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "role" "RoleValidationAchat" NOT NULL,
    "statut" "StatutValidationDemandeAchat" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "valideParId" TEXT,
    "dateAction" TIMESTAMP(3),

    CONSTRAINT "ValidationDemandeAchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonDeCommande" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "statut" "StatutBonDeCommande" NOT NULL DEFAULT 'OUVERT',
    "ouvertMarqueur" BOOLEAN,
    "envoyeParId" TEXT,
    "dateEnvoi" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonDeCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneBonDeCommande" (
    "id" TEXT NOT NULL,
    "bonDeCommandeId" TEXT NOT NULL,
    "ligneDemandeAchatId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(14,2) NOT NULL,
    "montantLigneTTC" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "LigneBonDeCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointeDevis" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,
    "ajouteParId" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceJointeDevis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametresAchat" (
    "id" TEXT NOT NULL,
    "seuilUrgence" DECIMAL(14,2) NOT NULL,
    "modifieParId" TEXT,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametresAchat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeAchat_numero_key" ON "DemandeAchat"("numero");

-- CreateIndex
CREATE INDEX "DemandeAchat_statut_idx" ON "DemandeAchat"("statut");

-- CreateIndex
CREATE INDEX "DemandeAchat_demandeurId_idx" ON "DemandeAchat"("demandeurId");

-- CreateIndex
CREATE INDEX "DemandeAchat_directeurDepartementId_statut_idx" ON "DemandeAchat"("directeurDepartementId", "statut");

-- CreateIndex
CREATE INDEX "LigneDemandeAchat_demandeId_idx" ON "LigneDemandeAchat"("demandeId");

-- CreateIndex
CREATE INDEX "LigneDemandeAchat_articleId_idx" ON "LigneDemandeAchat"("articleId");

-- CreateIndex
CREATE INDEX "ValidationDemandeAchat_demandeId_idx" ON "ValidationDemandeAchat"("demandeId");

-- CreateIndex
CREATE INDEX "ValidationDemandeAchat_role_statut_idx" ON "ValidationDemandeAchat"("role", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationDemandeAchat_demandeId_role_key" ON "ValidationDemandeAchat"("demandeId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "BonDeCommande_numero_key" ON "BonDeCommande"("numero");

-- CreateIndex
CREATE INDEX "BonDeCommande_statut_idx" ON "BonDeCommande"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "BonDeCommande_fournisseur_ouvertMarqueur_key" ON "BonDeCommande"("fournisseur", "ouvertMarqueur");

-- CreateIndex
CREATE UNIQUE INDEX "LigneBonDeCommande_ligneDemandeAchatId_key" ON "LigneBonDeCommande"("ligneDemandeAchatId");

-- CreateIndex
CREATE INDEX "LigneBonDeCommande_bonDeCommandeId_idx" ON "LigneBonDeCommande"("bonDeCommandeId");

-- AddForeignKey
ALTER TABLE "BonEntreeMagasin" ADD CONSTRAINT "BonEntreeMagasin_bonDeCommandeId_fkey" FOREIGN KEY ("bonDeCommandeId") REFERENCES "BonDeCommande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_lieuLivraisonProjetId_fkey" FOREIGN KEY ("lieuLivraisonProjetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_emetteurId_fkey" FOREIGN KEY ("emetteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_directeurDepartementId_fkey" FOREIGN KEY ("directeurDepartementId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeAchat" ADD CONSTRAINT "DemandeAchat_traiteParId_fkey" FOREIGN KEY ("traiteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeAchat" ADD CONSTRAINT "LigneDemandeAchat_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeAchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeAchat" ADD CONSTRAINT "LigneDemandeAchat_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationDemandeAchat" ADD CONSTRAINT "ValidationDemandeAchat_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeAchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationDemandeAchat" ADD CONSTRAINT "ValidationDemandeAchat_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonDeCommande" ADD CONSTRAINT "BonDeCommande_envoyeParId_fkey" FOREIGN KEY ("envoyeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonDeCommande" ADD CONSTRAINT "LigneBonDeCommande_bonDeCommandeId_fkey" FOREIGN KEY ("bonDeCommandeId") REFERENCES "BonDeCommande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonDeCommande" ADD CONSTRAINT "LigneBonDeCommande_ligneDemandeAchatId_fkey" FOREIGN KEY ("ligneDemandeAchatId") REFERENCES "LigneDemandeAchat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointeDevis" ADD CONSTRAINT "PieceJointeDevis_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeAchat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointeDevis" ADD CONSTRAINT "PieceJointeDevis_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametresAchat" ADD CONSTRAINT "ParametresAchat_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
