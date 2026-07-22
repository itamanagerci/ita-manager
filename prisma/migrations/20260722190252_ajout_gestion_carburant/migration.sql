-- CreateEnum
CREATE TYPE "StatutDemandeCarburant" AS ENUM ('EN_ATTENTE_LOGISTIQUE', 'EN_ATTENTE_DG', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('LEGER', 'LOURD');

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "quotaMensuelLitres" INTEGER NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "localisation" TEXT NOT NULL,
    "chantiersRattaches" TEXT[],
    "quantiteStockLitres" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reapprovisionnement" (
    "id" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "quantiteLitres" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fournisseur" TEXT NOT NULL,
    "effectueParId" TEXT,

    CONSTRAINT "Reapprovisionnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeCarburant" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "depotSourceId" TEXT NOT NULL,
    "kilometrageCompteur" INTEGER NOT NULL,
    "quantiteDemandeeLitres" INTEGER NOT NULL,
    "chantierMission" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "statut" "StatutDemandeCarburant" NOT NULL DEFAULT 'EN_ATTENTE_LOGISTIQUE',
    "motifRefus" TEXT,
    "cumulMensuelAvant" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeCarburant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_immatriculation_key" ON "Vehicule"("immatriculation");

-- CreateIndex
CREATE INDEX "DemandeCarburant_vehiculeId_statut_idx" ON "DemandeCarburant"("vehiculeId", "statut");

-- CreateIndex
CREATE INDEX "DemandeCarburant_statut_idx" ON "DemandeCarburant"("statut");

-- CreateIndex
CREATE INDEX "DemandeCarburant_demandeurId_idx" ON "DemandeCarburant"("demandeurId");

-- AddForeignKey
ALTER TABLE "Reapprovisionnement" ADD CONSTRAINT "Reapprovisionnement_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reapprovisionnement" ADD CONSTRAINT "Reapprovisionnement_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCarburant" ADD CONSTRAINT "DemandeCarburant_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCarburant" ADD CONSTRAINT "DemandeCarburant_depotSourceId_fkey" FOREIGN KEY ("depotSourceId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCarburant" ADD CONSTRAINT "DemandeCarburant_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
