-- CreateEnum
CREATE TYPE "StatutCodeAutorisationPaiementUrgent" AS ENUM ('EN_ATTENTE_DG', 'VALIDE', 'REFUSE', 'UTILISE', 'EXPIRE');

-- AlterTable
ALTER TABLE "BonDeCommande" ADD COLUMN     "fournisseurId" TEXT;

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "numeroWave" TEXT;

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "numeroWave" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "bonDeCommandeId" TEXT NOT NULL,
    "referenceFournisseur" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "dateFacture" TIMESTAMP(3) NOT NULL,
    "enregistreParId" TEXT,
    "dateEnregistrement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT,
    "demandeMissionId" TEXT,
    "montant" DECIMAL(14,2) NOT NULL,
    "mode" "TypePaiementAchat" NOT NULL,
    "reference" TEXT,
    "dateExecution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executeParId" TEXT,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeAutorisationPaiementUrgent" (
    "id" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "statut" "StatutCodeAutorisationPaiementUrgent" NOT NULL DEFAULT 'EN_ATTENTE_DG',
    "motifRefus" TEXT,
    "code" TEXT,
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "dateUtilisation" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeAutorisationPaiementUrgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaiementUrgent" (
    "id" TEXT NOT NULL,
    "codeAutorisationId" TEXT NOT NULL,
    "beneficiaireUtilisateurId" TEXT,
    "beneficiaireFournisseurId" TEXT,
    "montant" DECIMAL(14,2) NOT NULL,
    "executeParId" TEXT NOT NULL,
    "referenceSimulee" TEXT NOT NULL,
    "dateExecution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaiementUrgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fournisseur_nom_key" ON "Fournisseur"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_bonDeCommandeId_key" ON "Facture"("bonDeCommandeId");

-- CreateIndex
CREATE INDEX "Facture_bonDeCommandeId_idx" ON "Facture"("bonDeCommandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_factureId_key" ON "Paiement"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_demandeMissionId_key" ON "Paiement"("demandeMissionId");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_demandeMissionId_idx" ON "Paiement"("demandeMissionId");

-- CreateIndex
CREATE INDEX "CodeAutorisationPaiementUrgent_demandeurId_idx" ON "CodeAutorisationPaiementUrgent"("demandeurId");

-- CreateIndex
CREATE INDEX "CodeAutorisationPaiementUrgent_statut_idx" ON "CodeAutorisationPaiementUrgent"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "PaiementUrgent_codeAutorisationId_key" ON "PaiementUrgent"("codeAutorisationId");

-- CreateIndex
CREATE INDEX "PaiementUrgent_beneficiaireUtilisateurId_idx" ON "PaiementUrgent"("beneficiaireUtilisateurId");

-- CreateIndex
CREATE INDEX "PaiementUrgent_beneficiaireFournisseurId_idx" ON "PaiementUrgent"("beneficiaireFournisseurId");

-- AddForeignKey
ALTER TABLE "BonDeCommande" ADD CONSTRAINT "BonDeCommande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_bonDeCommandeId_fkey" FOREIGN KEY ("bonDeCommandeId") REFERENCES "BonDeCommande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_enregistreParId_fkey" FOREIGN KEY ("enregistreParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_demandeMissionId_fkey" FOREIGN KEY ("demandeMissionId") REFERENCES "DemandeMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_executeParId_fkey" FOREIGN KEY ("executeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeAutorisationPaiementUrgent" ADD CONSTRAINT "CodeAutorisationPaiementUrgent_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeAutorisationPaiementUrgent" ADD CONSTRAINT "CodeAutorisationPaiementUrgent_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementUrgent" ADD CONSTRAINT "PaiementUrgent_codeAutorisationId_fkey" FOREIGN KEY ("codeAutorisationId") REFERENCES "CodeAutorisationPaiementUrgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementUrgent" ADD CONSTRAINT "PaiementUrgent_beneficiaireUtilisateurId_fkey" FOREIGN KEY ("beneficiaireUtilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementUrgent" ADD CONSTRAINT "PaiementUrgent_beneficiaireFournisseurId_fkey" FOREIGN KEY ("beneficiaireFournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaiementUrgent" ADD CONSTRAINT "PaiementUrgent_executeParId_fkey" FOREIGN KEY ("executeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
