-- CreateEnum
CREATE TYPE "EtatVehicule" AS ENUM ('OK', 'PANNE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "TypeMouvementVehicule" AS ENUM ('CHANGEMENT_ETAT', 'CHANGEMENT_AFFECTATION', 'SORTIE_DEFINITIVE');

-- CreateEnum
CREATE TYPE "NatureDemandeTransport" AS ENUM ('TRANSPORT_TRANSFERT', 'MISE_A_DISPOSITION');

-- CreateEnum
CREATE TYPE "StatutDemandeTransport" AS ENUM ('SOUMIS', 'VISA_LOGISTIQUE', 'VERIFIE_DEPART', 'EN_COURS', 'VERIFIE_RETOUR', 'ARCHIVE', 'REFUSE');

-- CreateEnum
CREATE TYPE "CategorieItemChecklistTransport" AS ENUM ('MATERIEL_BORD', 'PIECE_ADMINISTRATIVE', 'DOCUMENT_SUIVI');

-- CreateEnum
CREATE TYPE "CategorieInspection" AS ENUM ('VEHICULE', 'ENGIN');

-- CreateEnum
CREATE TYPE "EtatPointInspection" AS ENUM ('BON', 'MAUVAIS', 'ABSENT');

-- CreateEnum
CREATE TYPE "StatutInspection" AS ENUM ('RENSEIGNEE', 'POINTS_CONTROLES', 'DOCS_CONTROLEES', 'SIGNEE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "StatutBonSortieTransfert" AS ENUM ('CREE', 'ARTICLES_RENSEIGNES', 'SIGNE');

-- AlterEnum
ALTER TYPE "TypeVehicule" ADD VALUE 'ENGIN';

-- AlterTable
ALTER TABLE "Materiel" ALTER COLUMN "dateModification" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vehicule" ADD COLUMN     "annee" INTEGER,
ADD COLUMN     "chantierActuel" TEXT,
ADD COLUMN     "chauffeurActuelId" TEXT,
ADD COLUMN     "compteurActuel" INTEGER,
ADD COLUMN     "dateAffectation" TIMESTAMP(3),
ADD COLUMN     "dateDerniereVerificationInventaire" TIMESTAMP(3),
ADD COLUMN     "dateEntree" TIMESTAMP(3),
ADD COLUMN     "dateSortieDefinitive" TIMESTAMP(3),
ADD COLUMN     "etat" "EtatVehicule" NOT NULL DEFAULT 'OK',
ADD COLUMN     "etatConstateDerniereVerification" "EtatVehicule",
ADD COLUMN     "marque" TEXT,
ADD COLUMN     "modeAcquisition" TEXT,
ADD COLUMN     "modele" TEXT,
ADD COLUMN     "motifSortieDefinitive" TEXT,
ADD COLUMN     "numeroInterne" TEXT,
ADD COLUMN     "valeurResiduelle" DECIMAL(14,2),
ADD COLUMN     "verificateurDerniereVerificationId" TEXT;

-- CreateTable
CREATE TABLE "HistoriqueMouvementVehicule" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "type" "TypeMouvementVehicule" NOT NULL,
    "etatAvant" "EtatVehicule",
    "etatApres" "EtatVehicule",
    "chantierAvant" TEXT,
    "chantierApres" TEXT,
    "commentaire" TEXT,
    "effectueParId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueMouvementVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypePieceAdministrative" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "periodiciteMois" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TypePieceAdministrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceAdministrativeVehicule" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "typePieceId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "cheminFichier" TEXT,
    "nomFichierOriginal" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceAdministrativeVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeTransport" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "serviceChantier" TEXT NOT NULL,
    "cia" TEXT NOT NULL,
    "nature" "NatureDemandeTransport" NOT NULL,
    "description" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "statut" "StatutDemandeTransport" NOT NULL DEFAULT 'SOUMIS',
    "vehiculeId" TEXT,
    "visaLogistiqueParId" TEXT,
    "dateVisaLogistique" TIMESTAMP(3),
    "conducteurDepartNom" TEXT,
    "compteurDepart" INTEGER,
    "dateDepartReelle" TIMESTAMP(3),
    "gestionnaireDepartId" TEXT,
    "conducteurRetourNom" TEXT,
    "compteurRetour" INTEGER,
    "dateRetourReelle" TIMESTAMP(3),
    "gestionnaireRetourId" TEXT,
    "referenceEngin" TEXT,
    "motifRefus" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemChecklistTransport" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieItemChecklistTransport" NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemChecklistTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponseChecklistTransport" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "presentDepart" BOOLEAN,
    "presentRetour" BOOLEAN,

    CONSTRAINT "ReponseChecklistTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointInspection" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieInspection" NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PointInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentInspection" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieInspection" NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionVehicule" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "demandeTransportId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "chantierSiteLieu" TEXT NOT NULL,
    "kilometrage" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "conducteurNom" TEXT NOT NULL,
    "transporteurNom" TEXT,
    "niveauCarburant" INTEGER NOT NULL,
    "receptionnaireVerificateurId" TEXT NOT NULL,
    "chefChantierId" TEXT,
    "remorqueurNom" TEXT,
    "statut" "StatutInspection" NOT NULL DEFAULT 'RENSEIGNEE',
    "anomalieDetectee" BOOLEAN NOT NULL DEFAULT false,
    "dateSignature" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponsePointInspectionVehicule" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "etat" "EtatPointInspection" NOT NULL,
    "observation" TEXT,

    CONSTRAINT "ReponsePointInspectionVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponseDocumentInspectionVehicule" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "etat" "EtatPointInspection" NOT NULL,
    "observation" TEXT,

    CONSTRAINT "ReponseDocumentInspectionVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionEngin" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "demandeTransportId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "chantierSite" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "conducteurNom" TEXT,
    "transporteurNom" TEXT,
    "receptionnaireVerificateurId" TEXT NOT NULL,
    "chefChantierOuGarageId" TEXT,
    "transporteurEnginNom" TEXT,
    "statut" "StatutInspection" NOT NULL DEFAULT 'RENSEIGNEE',
    "anomalieDetectee" BOOLEAN NOT NULL DEFAULT false,
    "dateSignature" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionEngin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponsePointInspectionEngin" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "etat" "EtatPointInspection" NOT NULL,
    "observation" TEXT,

    CONSTRAINT "ReponsePointInspectionEngin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponseDocumentInspectionEngin" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "etat" "EtatPointInspection" NOT NULL,
    "observation" TEXT,

    CONSTRAINT "ReponseDocumentInspectionEngin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonSortieTransfert" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "dateSortie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lieuSortie" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "receptionnaireNom" TEXT NOT NULL,
    "receptionnaireContact" TEXT NOT NULL,
    "cia" TEXT,
    "demandeTransportId" TEXT,
    "demandeurId" TEXT NOT NULL,
    "expediteurConvoyeurId" TEXT,
    "dateVisaExpediteur" TIMESTAMP(3),
    "responsableSortieId" TEXT,
    "dateVisaResponsableSortie" TIMESTAMP(3),
    "statut" "StatutBonSortieTransfert" NOT NULL DEFAULT 'CREE',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonSortieTransfert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneBonSortieTransfert" (
    "id" TEXT NOT NULL,
    "bonId" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "etat" TEXT,
    "observation" TEXT,

    CONSTRAINT "LigneBonSortieTransfert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoriqueMouvementVehicule_vehiculeId_date_idx" ON "HistoriqueMouvementVehicule"("vehiculeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TypePieceAdministrative_code_key" ON "TypePieceAdministrative"("code");

-- CreateIndex
CREATE INDEX "PieceAdministrativeVehicule_vehiculeId_idx" ON "PieceAdministrativeVehicule"("vehiculeId");

-- CreateIndex
CREATE INDEX "PieceAdministrativeVehicule_dateExpiration_idx" ON "PieceAdministrativeVehicule"("dateExpiration");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeTransport_numero_key" ON "DemandeTransport"("numero");

-- CreateIndex
CREATE INDEX "DemandeTransport_statut_idx" ON "DemandeTransport"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "ItemChecklistTransport_code_key" ON "ItemChecklistTransport"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReponseChecklistTransport_demandeId_itemId_key" ON "ReponseChecklistTransport"("demandeId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PointInspection_code_key" ON "PointInspection"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentInspection_code_key" ON "DocumentInspection"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionVehicule_numero_key" ON "InspectionVehicule"("numero");

-- CreateIndex
CREATE INDEX "InspectionVehicule_vehiculeId_idx" ON "InspectionVehicule"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReponsePointInspectionVehicule_inspectionId_pointId_key" ON "ReponsePointInspectionVehicule"("inspectionId", "pointId");

-- CreateIndex
CREATE UNIQUE INDEX "ReponseDocumentInspectionVehicule_inspectionId_documentId_key" ON "ReponseDocumentInspectionVehicule"("inspectionId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionEngin_numero_key" ON "InspectionEngin"("numero");

-- CreateIndex
CREATE INDEX "InspectionEngin_vehiculeId_idx" ON "InspectionEngin"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReponsePointInspectionEngin_inspectionId_pointId_key" ON "ReponsePointInspectionEngin"("inspectionId", "pointId");

-- CreateIndex
CREATE UNIQUE INDEX "ReponseDocumentInspectionEngin_inspectionId_documentId_key" ON "ReponseDocumentInspectionEngin"("inspectionId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "BonSortieTransfert_numero_key" ON "BonSortieTransfert"("numero");

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_chauffeurActuelId_fkey" FOREIGN KEY ("chauffeurActuelId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_verificateurDerniereVerificationId_fkey" FOREIGN KEY ("verificateurDerniereVerificationId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueMouvementVehicule" ADD CONSTRAINT "HistoriqueMouvementVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueMouvementVehicule" ADD CONSTRAINT "HistoriqueMouvementVehicule_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceAdministrativeVehicule" ADD CONSTRAINT "PieceAdministrativeVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceAdministrativeVehicule" ADD CONSTRAINT "PieceAdministrativeVehicule_typePieceId_fkey" FOREIGN KEY ("typePieceId") REFERENCES "TypePieceAdministrative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTransport" ADD CONSTRAINT "DemandeTransport_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTransport" ADD CONSTRAINT "DemandeTransport_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTransport" ADD CONSTRAINT "DemandeTransport_visaLogistiqueParId_fkey" FOREIGN KEY ("visaLogistiqueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTransport" ADD CONSTRAINT "DemandeTransport_gestionnaireDepartId_fkey" FOREIGN KEY ("gestionnaireDepartId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeTransport" ADD CONSTRAINT "DemandeTransport_gestionnaireRetourId_fkey" FOREIGN KEY ("gestionnaireRetourId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseChecklistTransport" ADD CONSTRAINT "ReponseChecklistTransport_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeTransport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseChecklistTransport" ADD CONSTRAINT "ReponseChecklistTransport_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemChecklistTransport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionVehicule" ADD CONSTRAINT "InspectionVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionVehicule" ADD CONSTRAINT "InspectionVehicule_receptionnaireVerificateurId_fkey" FOREIGN KEY ("receptionnaireVerificateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionVehicule" ADD CONSTRAINT "InspectionVehicule_chefChantierId_fkey" FOREIGN KEY ("chefChantierId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionVehicule" ADD CONSTRAINT "ReponsePointInspectionVehicule_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionVehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionVehicule" ADD CONSTRAINT "ReponsePointInspectionVehicule_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "PointInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseDocumentInspectionVehicule" ADD CONSTRAINT "ReponseDocumentInspectionVehicule_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionVehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseDocumentInspectionVehicule" ADD CONSTRAINT "ReponseDocumentInspectionVehicule_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionEngin" ADD CONSTRAINT "InspectionEngin_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionEngin" ADD CONSTRAINT "InspectionEngin_receptionnaireVerificateurId_fkey" FOREIGN KEY ("receptionnaireVerificateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionEngin" ADD CONSTRAINT "InspectionEngin_chefChantierOuGarageId_fkey" FOREIGN KEY ("chefChantierOuGarageId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionEngin" ADD CONSTRAINT "ReponsePointInspectionEngin_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionEngin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionEngin" ADD CONSTRAINT "ReponsePointInspectionEngin_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "PointInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseDocumentInspectionEngin" ADD CONSTRAINT "ReponseDocumentInspectionEngin_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionEngin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseDocumentInspectionEngin" ADD CONSTRAINT "ReponseDocumentInspectionEngin_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieTransfert" ADD CONSTRAINT "BonSortieTransfert_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieTransfert" ADD CONSTRAINT "BonSortieTransfert_expediteurConvoyeurId_fkey" FOREIGN KEY ("expediteurConvoyeurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonSortieTransfert" ADD CONSTRAINT "BonSortieTransfert_responsableSortieId_fkey" FOREIGN KEY ("responsableSortieId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonSortieTransfert" ADD CONSTRAINT "LigneBonSortieTransfert_bonId_fkey" FOREIGN KEY ("bonId") REFERENCES "BonSortieTransfert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneBonSortieTransfert" ADD CONSTRAINT "LigneBonSortieTransfert_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

