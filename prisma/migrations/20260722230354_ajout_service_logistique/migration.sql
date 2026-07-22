-- CreateEnum
CREATE TYPE "TypeMouvementStock" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "UrgenceDMS" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "StatutVerificationStock" AS ENUM ('DISPONIBLE', 'RUPTURE_PARTIELLE', 'RUPTURE_TOTALE');

-- CreateEnum
CREATE TYPE "DecisionLogisticien" AS ENUM ('APPROUVEE', 'TRANSFERT_INTER_MAGASIN', 'DEMANDE_ACHAT_DECLENCHEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutDMS" AS ENUM ('EN_ATTENTE_VERIFICATION', 'EN_ATTENTE_DECISION', 'APPROUVEE', 'TRANSFERT_INTER_MAGASIN', 'DEMANDE_ACHAT_DECLENCHEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutBonSortie" AS ENUM ('EMIS', 'RECU');

-- CreateEnum
CREATE TYPE "ConformiteBEM" AS ENUM ('CONFORME', 'NON_CONFORME_AVEC_RESERVES');

-- CreateEnum
CREATE TYPE "ActionEcartBEM" AS ENUM ('RETOUR_FOURNISSEUR', 'AVOIR_A_RECEVOIR', 'REGULARISATION_ADMIN', 'ACCEPTE_AVEC_RESERVE');

-- CreateEnum
CREATE TYPE "StatutBEM" AS ENUM ('EN_ATTENTE_VALIDATION', 'VALIDE');

-- CreateEnum
CREATE TYPE "TypeInventaire" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL', 'EXCEPTIONNEL');

-- CreateEnum
CREATE TYPE "StatutSessionInventaire" AS ENUM ('EN_COURS', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "StatutDemandeReapprovisionnement" AS ENUM ('EN_ATTENTE_ACHAT');

-- AlterTable
ALTER TABLE "Materiel" ADD COLUMN     "categorieId" TEXT,
ADD COLUMN     "dateCreationStock" TIMESTAMP(3),
ADD COLUMN     "delaiFournisseurMoyenJours" INTEGER,
ADD COLUMN     "emplacement" TEXT,
ADD COLUMN     "fournisseurHabituel" TEXT,
ADD COLUMN     "magasinId" TEXT,
ADD COLUMN     "quantiteReapproStandard" INTEGER,
ADD COLUMN     "quantiteStock" INTEGER,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "seuilAlerte" INTEGER,
ADD COLUMN     "stockSecurite" INTEGER,
ADD COLUMN     "uniteMesureId" TEXT;

-- CreateTable
CREATE TABLE "Magasin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "responsableId" TEXT,

    CONSTRAINT "Magasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorieMateriel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategorieMateriel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniteMesure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UniteMesure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "type" "TypeMouvementStock" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "quantiteApresMouvement" INTEGER NOT NULL,
    "motif" TEXT,
    "effectueParId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeMiseADisposition" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "magasinId" TEXT NOT NULL,
    "chantierService" TEXT NOT NULL,
    "urgence" "UrgenceDMS" NOT NULL DEFAULT 'NORMAL',
    "justificationUrgence" TEXT,
    "demandeurId" TEXT NOT NULL,
    "demandeurPoste" TEXT NOT NULL,
    "demandeurTelephone" TEXT NOT NULL,
    "statut" "StatutDMS" NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    "verificationStatut" "StatutVerificationStock",
    "verificationObservations" TEXT,
    "verifieParId" TEXT,
    "dateVerification" TIMESTAMP(3),
    "decision" "DecisionLogisticien",
    "motifRefus" TEXT,
    "decideParId" TEXT,
    "dateDecision" TIMESTAMP(3),
    "demandeReapprovisionnementId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeMiseADisposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDemandeMiseADisposition" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "quantiteDemandee" INTEGER NOT NULL,

    CONSTRAINT "LigneDemandeMiseADisposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonSortieMagasin" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "demandeId" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "destinataireChantier" TEXT NOT NULL,
    "statut" "StatutBonSortie" NOT NULL DEFAULT 'EMIS',
    "preparateurId" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recuParId" TEXT,
    "dateReception" TIMESTAMP(3),

    CONSTRAINT "BonSortieMagasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonEntreeMagasin" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "demandeReapprovisionnementId" TEXT,
    "bonLivraisonFournisseurNumero" TEXT NOT NULL,
    "dateReception" TIMESTAMP(3) NOT NULL,
    "magasinId" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "conformite" "ConformiteBEM",
    "reserves" TEXT,
    "actionEcart" "ActionEcartBEM",
    "statut" "StatutBEM" NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "receptionneParId" TEXT,
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonEntreeMagasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneBonEntreeMagasin" (
    "id" TEXT NOT NULL,
    "bemId" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "quantiteRecue" INTEGER NOT NULL,

    CONSTRAINT "LigneBonEntreeMagasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionInventaire" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "type" "TypeInventaire" NOT NULL,
    "magasinId" TEXT NOT NULL,
    "equipeComptage" TEXT,
    "statut" "StatutSessionInventaire" NOT NULL DEFAULT 'EN_COURS',
    "effectueParId" TEXT,
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneInventaire" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "quantiteTheorique" INTEGER NOT NULL,
    "quantitePhysique" INTEGER NOT NULL,
    "ecart" INTEGER NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "LigneInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeReapprovisionnement" (
    "id" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "statut" "StatutDemandeReapprovisionnement" NOT NULL DEFAULT 'EN_ATTENTE_ACHAT',
    "quantiteStockConstatee" INTEGER NOT NULL,
    "seuilAlerteConstate" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeReapprovisionnement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Magasin_code_key" ON "Magasin"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CategorieMateriel_code_key" ON "CategorieMateriel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UniteMesure_code_key" ON "UniteMesure"("code");

-- CreateIndex
CREATE INDEX "MouvementStock_materielId_date_idx" ON "MouvementStock"("materielId", "date");

-- CreateIndex
CREATE INDEX "MouvementStock_type_idx" ON "MouvementStock"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeMiseADisposition_numero_key" ON "DemandeMiseADisposition"("numero");

-- CreateIndex
CREATE INDEX "DemandeMiseADisposition_magasinId_statut_idx" ON "DemandeMiseADisposition"("magasinId", "statut");

-- CreateIndex
CREATE INDEX "DemandeMiseADisposition_statut_idx" ON "DemandeMiseADisposition"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "BonSortieMagasin_numero_key" ON "BonSortieMagasin"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "BonSortieMagasin_demandeId_key" ON "BonSortieMagasin"("demandeId");

-- CreateIndex
CREATE INDEX "BonSortieMagasin_statut_idx" ON "BonSortieMagasin"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "BonEntreeMagasin_numero_key" ON "BonEntreeMagasin"("numero");

-- CreateIndex
CREATE INDEX "BonEntreeMagasin_magasinId_statut_idx" ON "BonEntreeMagasin"("magasinId", "statut");

-- CreateIndex
CREATE INDEX "BonEntreeMagasin_statut_idx" ON "BonEntreeMagasin"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "SessionInventaire_numero_key" ON "SessionInventaire"("numero");

-- CreateIndex
CREATE INDEX "SessionInventaire_statut_idx" ON "SessionInventaire"("statut");

-- CreateIndex
CREATE INDEX "SessionInventaire_magasinId_idx" ON "SessionInventaire"("magasinId");

-- CreateIndex
CREATE UNIQUE INDEX "LigneInventaire_sessionId_materielId_key" ON "LigneInventaire"("sessionId", "materielId");

-- CreateIndex
CREATE INDEX "DemandeReapprovisionnement_statut_idx" ON "DemandeReapprovisionnement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeReapprovisionnement_materielId_statut_key" ON "DemandeReapprovisionnement"("materielId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Materiel_reference_key" ON "Materiel"("reference");

-- CreateIndex
CREATE INDEX "Materiel_categorieId_idx" ON "Materiel"("categorieId");

-- CreateIndex
CREATE INDEX "Materiel_magasinId_idx" ON "Materiel"("magasinId");

-- AddForeignKey
ALTER TABLE "Materiel" ADD CONSTRAINT "Materiel_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "CategorieMateriel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materiel" ADD CONSTRAINT "Materiel_uniteMesureId_fkey" FOREIGN KEY ("uniteMesureId") REFERENCES "UniteMesure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materiel" ADD CONSTRAINT "Materiel_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Magasin" ADD CONSTRAINT "Magasin_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMiseADisposition" ADD CONSTRAINT "DemandeMiseADisposition_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMiseADisposition" ADD CONSTRAINT "DemandeMiseADisposition_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMiseADisposition" ADD CONSTRAINT "DemandeMiseADisposition_verifieParId_fkey" FOREIGN KEY ("verifieParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeMiseADisposition" ADD CONSTRAINT "DemandeMiseADisposition_decideParId_fkey" FOREIGN KEY ("decideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeMiseADisposition" ADD CONSTRAINT "LigneDemandeMiseADisposition_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeMiseADisposition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDemandeMiseADisposition" ADD CONSTRAINT "LigneDemandeMiseADisposition_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieMagasin" ADD CONSTRAINT "BonSortieMagasin_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeMiseADisposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieMagasin" ADD CONSTRAINT "BonSortieMagasin_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieMagasin" ADD CONSTRAINT "BonSortieMagasin_preparateurId_fkey" FOREIGN KEY ("preparateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieMagasin" ADD CONSTRAINT "BonSortieMagasin_recuParId_fkey" FOREIGN KEY ("recuParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEntreeMagasin" ADD CONSTRAINT "BonEntreeMagasin_demandeReapprovisionnementId_fkey" FOREIGN KEY ("demandeReapprovisionnementId") REFERENCES "DemandeReapprovisionnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEntreeMagasin" ADD CONSTRAINT "BonEntreeMagasin_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEntreeMagasin" ADD CONSTRAINT "BonEntreeMagasin_receptionneParId_fkey" FOREIGN KEY ("receptionneParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonEntreeMagasin" ADD CONSTRAINT "BonEntreeMagasin_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonEntreeMagasin" ADD CONSTRAINT "LigneBonEntreeMagasin_bemId_fkey" FOREIGN KEY ("bemId") REFERENCES "BonEntreeMagasin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonEntreeMagasin" ADD CONSTRAINT "LigneBonEntreeMagasin_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionInventaire" ADD CONSTRAINT "SessionInventaire_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "Magasin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionInventaire" ADD CONSTRAINT "SessionInventaire_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionInventaire" ADD CONSTRAINT "SessionInventaire_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionInventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeReapprovisionnement" ADD CONSTRAINT "DemandeReapprovisionnement_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

