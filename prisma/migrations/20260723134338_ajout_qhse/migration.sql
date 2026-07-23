-- CreateEnum
CREATE TYPE "StatutAccueilSecurite" AS ENUM ('EN_ATTENTE', 'EFFECTUE');

-- CreateEnum
CREATE TYPE "StatutTravailleurAccueil" AS ENUM ('PERMANENT', 'OCCASIONNEL', 'VISITEUR');

-- CreateEnum
CREATE TYPE "StatutAST" AS ENUM ('EN_ATTENTE_VALIDATION_QHSE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "ReponseInspectionHSE" AS ENUM ('OUI', 'NON');

-- CreateEnum
CREATE TYPE "LieuPVSensibilisation" AS ENUM ('CHANTIER', 'BUREAUX', 'GARAGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeNotificationIncident" AS ENUM ('ACCIDENT', 'INCIDENT', 'PRESQU_ACCIDENT');

-- CreateEnum
CREATE TYPE "RoleImpliqueRapportIncident" AS ENUM ('VICTIME', 'TEMOIN');

-- CreateEnum
CREATE TYPE "TypePersonneImpliquee" AS ENUM ('PERMANENT', 'OCCASIONNEL', 'COLLATERAL');

-- CreateEnum
CREATE TYPE "TypeNonConformite" AS ENUM ('RECLAMATION', 'NON_RESPECT_EXIGENCE', 'AUDIT_EXTERNE', 'INSPECTION_VISUELLE', 'CONTROLE_QUALITE', 'INDICATEUR_NON_ATTEINT');

-- CreateEnum
CREATE TYPE "StatutNonConformite" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "DecisionClotureNonConformite" AS ENUM ('ACCEPTEE', 'REFUSEE', 'A_CONFIRMER_PROCHAINE_VERIFICATION');

-- AlterEnum
ALTER TYPE "CategorieInspection" ADD VALUE 'HSE';

-- CreateTable
CREATE TABLE "AccueilSecurite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "age" INTEGER,
    "statutTravailleur" "StatutTravailleurAccueil",
    "contactsTelephone" TEXT,
    "lieuHabitation" TEXT,
    "personneContactUrgenceNom" TEXT,
    "personneContactUrgenceTelephone" TEXT,
    "epiRecus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autresEquipements" TEXT,
    "informationsFormationsRecues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sensibilisationsConduites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statut" "StatutAccueilSecurite" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateSignatureTravailleur" TIMESTAMP(3),
    "responsableAccueilId" TEXT,
    "dateSignatureResponsable" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccueilSecurite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheAST" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "chefChantierId" TEXT NOT NULL,
    "dateSignatureChefChantier" TIMESTAMP(3),
    "relaisQHSEId" TEXT,
    "dateSignatureRelaisQHSE" TIMESTAMP(3),
    "statut" "StatutAST" NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION_QHSE',
    "motifRefus" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FicheAST_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacheAST" (
    "id" TEXT NOT NULL,
    "astId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "ressources" TEXT NOT NULL,
    "risques" TEXT NOT NULL,
    "mesuresPrevention" TEXT NOT NULL,

    CONSTRAINT "TacheAST_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionEPI" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "lieu" TEXT,
    "beneficiaireId" TEXT NOT NULL,
    "materielId" TEXT NOT NULL,
    "quantiteSortie" INTEGER NOT NULL,
    "retourEpiUsage" BOOLEAN NOT NULL DEFAULT false,
    "effectueParId" TEXT,
    "mouvementStockId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributionEPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionHSE" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "projetOuvrageLibre" TEXT,
    "lieu" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "commentaires" TEXT,
    "responsableInspectionId" TEXT NOT NULL,
    "dateSignatureResponsable" TIMESTAMP(3),
    "relaisQHSEId" TEXT,
    "dateSignatureRelaisQHSE" TIMESTAMP(3),
    "chefChantierId" TEXT,
    "dateSignatureChefChantier" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionHSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponsePointInspectionHSE" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "reponse" "ReponseInspectionHSE" NOT NULL,
    "observation" TEXT,

    CONSTRAINT "ReponsePointInspectionHSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoInspectionHSE" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,
    "ajouteParId" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoInspectionHSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportHebdoQHSE" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "relaisQHSEId" TEXT NOT NULL,
    "semaineDu" TIMESTAMP(3) NOT NULL,
    "semaineAu" TIMESTAMP(3) NOT NULL,
    "effectifVendredi" INTEGER NOT NULL,
    "effectifSamedi" INTEGER NOT NULL,
    "effectifLundi" INTEGER NOT NULL,
    "effectifMardi" INTEGER NOT NULL,
    "effectifMercredi" INTEGER NOT NULL,
    "effectifJeudi" INTEGER NOT NULL,
    "activitesQHSE" TEXT NOT NULL,
    "constatsEffectues" TEXT NOT NULL,
    "propositionsRecommandations" TEXT NOT NULL,
    "dateSignature" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RapportHebdoQHSE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeSensibilisation" (
    "id" TEXT NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "periodeDu" TIMESTAMP(3) NOT NULL,
    "periodeAu" TIMESTAMP(3) NOT NULL,
    "creeParId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammeSensibilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeanceSensibilisation" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "theme" TEXT NOT NULL,
    "animateur" TEXT NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "SeanceSensibilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PVSensibilisation" (
    "id" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "animateur" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "lieu" TEXT,
    "chantierType" "LieuPVSensibilisation" NOT NULL,
    "lieuAutrePrecision" TEXT,
    "sujetsAbordes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sujetsAbordesAutrePrecision" TEXT,
    "pointsSpecifiquesAbordes" TEXT,
    "resumeSensibilisation" TEXT,
    "animateurVisaDate" TIMESTAMP(3),
    "serviceQHSEVisaId" TEXT,
    "serviceQHSEVisaDate" TIMESTAMP(3),
    "observation" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PVSensibilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantPVSensibilisation" (
    "id" TEXT NOT NULL,
    "pvId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "poste" TEXT,
    "aSigne" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParticipantPVSensibilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportIncident" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "dateEvenement" TIMESTAMP(3) NOT NULL,
    "projetId" TEXT,
    "chantierLibre" TEXT,
    "lieu" TEXT,
    "directionServiceLibre" TEXT,
    "reporteParId" TEXT NOT NULL,
    "typeNotification" "TypeNotificationIncident" NOT NULL,
    "activite" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activiteAutrePrecision" TEXT,
    "descriptionDommages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionDommagesAutrePrecision" TEXT,
    "resumeEvenement" TEXT NOT NULL,
    "schemaCorporelPartiesAtteintes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "typeBlessure" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionBlessure" TEXT,
    "dommagesEnvironnementaux" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dommagesEnvironnementauxAutrePrecision" TEXT,
    "descriptionDommagesEnvironnementaux" TEXT,
    "rapportPolice" BOOLEAN NOT NULL DEFAULT false,
    "datePolice" TIMESTAMP(3),
    "postePolice" TEXT,
    "rapportAssurance" BOOLEAN NOT NULL DEFAULT false,
    "dateAssurance" TIMESTAMP(3),
    "referenceAssurance" TEXT,
    "rapportExpertise" BOOLEAN NOT NULL DEFAULT false,
    "dateExpertise" TIMESTAMP(3),
    "referenceExpertise" TEXT,
    "dommagesBiensEquipementsDetails" TEXT,
    "fraisMedicauxCoutDommages" DECIMAL(14,2),
    "equipeInvestigation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesMatiere" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesMethode" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesMainOeuvre" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesMachine" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesMilieu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "causesDivers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analyseCausesMatiere" TEXT,
    "analyseCausesMethode" TEXT,
    "analyseCausesMainOeuvre" TEXT,
    "analyseCausesMachine" TEXT,
    "analyseCausesMilieu" TEXT,
    "nonConformiteIdentifiee" BOOLEAN NOT NULL DEFAULT false,
    "nonConformiteDescription" TEXT,
    "creeParId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonneImpliqueeRapportIncident" (
    "id" TEXT NOT NULL,
    "rapportIncidentId" TEXT NOT NULL,
    "role" "RoleImpliqueRapportIncident" NOT NULL,
    "nom" TEXT NOT NULL,
    "fonction" TEXT,
    "typePersonne" "TypePersonneImpliquee",

    CONSTRAINT "PersonneImpliqueeRapportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionImmediateRapportIncident" (
    "id" TEXT NOT NULL,
    "rapportIncidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "clotureLe" TIMESTAMP(3),

    CONSTRAINT "ActionImmediateRapportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRapportIncident" (
    "id" TEXT NOT NULL,
    "rapportIncidentId" TEXT NOT NULL,
    "correction" TEXT NOT NULL,
    "responsable" TEXT NOT NULL,
    "echeance" TIMESTAMP(3),
    "ressourcesNecessaires" TEXT,
    "clotureLe" TIMESTAMP(3),

    CONSTRAINT "CorrectionRapportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoRapportIncident" (
    "id" TEXT NOT NULL,
    "rapportIncidentId" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,
    "ajouteParId" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoRapportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformite" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identificateurId" TEXT NOT NULL,
    "typeNonConformite" "TypeNonConformite" NOT NULL,
    "processus" TEXT,
    "normeDocReference" TEXT,
    "refExigence" TEXT,
    "descriptionNonConformite" TEXT NOT NULL,
    "preuveDescription" TEXT,
    "correctionContenu" TEXT,
    "correctionDelai" TIMESTAMP(3),
    "analyseCausesContenu" TEXT,
    "analyseCausesDelai" TIMESTAMP(3),
    "actionsCorrectivesContenu" TEXT,
    "actionsCorrectivesDelai" TIMESTAMP(3),
    "dateAchevement" TIMESTAMP(3),
    "responsableMiseOeuvreId" TEXT,
    "dateSignatureMiseOeuvre" TIMESTAMP(3),
    "statut" "StatutNonConformite" NOT NULL DEFAULT 'OUVERTE',
    "decisionCloture" "DecisionClotureNonConformite",
    "responsableQHSEId" TEXT,
    "dateCloture" TIMESTAMP(3),
    "reponsePointInspectionHSEId" TEXT,
    "rapportIncidentId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoNonConformite" (
    "id" TEXT NOT NULL,
    "nonConformiteId" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "nomFichierOriginal" TEXT NOT NULL,
    "ajouteParId" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoNonConformite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccueilSecurite_utilisateurId_key" ON "AccueilSecurite"("utilisateurId");

-- CreateIndex
CREATE INDEX "AccueilSecurite_statut_idx" ON "AccueilSecurite"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "FicheAST_numero_key" ON "FicheAST"("numero");

-- CreateIndex
CREATE INDEX "FicheAST_statut_idx" ON "FicheAST"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionEPI_numero_key" ON "AttributionEPI"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionEPI_mouvementStockId_key" ON "AttributionEPI"("mouvementStockId");

-- CreateIndex
CREATE INDEX "AttributionEPI_beneficiaireId_idx" ON "AttributionEPI"("beneficiaireId");

-- CreateIndex
CREATE INDEX "AttributionEPI_materielId_idx" ON "AttributionEPI"("materielId");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionHSE_numero_key" ON "InspectionHSE"("numero");

-- CreateIndex
CREATE INDEX "InspectionHSE_projetId_idx" ON "InspectionHSE"("projetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReponsePointInspectionHSE_inspectionId_pointId_key" ON "ReponsePointInspectionHSE"("inspectionId", "pointId");

-- CreateIndex
CREATE UNIQUE INDEX "RapportHebdoQHSE_numero_key" ON "RapportHebdoQHSE"("numero");

-- CreateIndex
CREATE INDEX "RapportHebdoQHSE_projetId_idx" ON "RapportHebdoQHSE"("projetId");

-- CreateIndex
CREATE UNIQUE INDEX "PVSensibilisation_seanceId_key" ON "PVSensibilisation"("seanceId");

-- CreateIndex
CREATE UNIQUE INDEX "RapportIncident_numero_key" ON "RapportIncident"("numero");

-- CreateIndex
CREATE INDEX "RapportIncident_projetId_idx" ON "RapportIncident"("projetId");

-- CreateIndex
CREATE INDEX "RapportIncident_typeNotification_idx" ON "RapportIncident"("typeNotification");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformite_reponsePointInspectionHSEId_key" ON "NonConformite"("reponsePointInspectionHSEId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformite_rapportIncidentId_key" ON "NonConformite"("rapportIncidentId");

-- CreateIndex
CREATE INDEX "NonConformite_statut_idx" ON "NonConformite"("statut");

-- AddForeignKey
ALTER TABLE "AccueilSecurite" ADD CONSTRAINT "AccueilSecurite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccueilSecurite" ADD CONSTRAINT "AccueilSecurite_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccueilSecurite" ADD CONSTRAINT "AccueilSecurite_responsableAccueilId_fkey" FOREIGN KEY ("responsableAccueilId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheAST" ADD CONSTRAINT "FicheAST_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheAST" ADD CONSTRAINT "FicheAST_chefChantierId_fkey" FOREIGN KEY ("chefChantierId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheAST" ADD CONSTRAINT "FicheAST_relaisQHSEId_fkey" FOREIGN KEY ("relaisQHSEId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacheAST" ADD CONSTRAINT "TacheAST_astId_fkey" FOREIGN KEY ("astId") REFERENCES "FicheAST"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEPI" ADD CONSTRAINT "AttributionEPI_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEPI" ADD CONSTRAINT "AttributionEPI_beneficiaireId_fkey" FOREIGN KEY ("beneficiaireId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEPI" ADD CONSTRAINT "AttributionEPI_materielId_fkey" FOREIGN KEY ("materielId") REFERENCES "Materiel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEPI" ADD CONSTRAINT "AttributionEPI_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionEPI" ADD CONSTRAINT "AttributionEPI_mouvementStockId_fkey" FOREIGN KEY ("mouvementStockId") REFERENCES "MouvementStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionHSE" ADD CONSTRAINT "InspectionHSE_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionHSE" ADD CONSTRAINT "InspectionHSE_responsableInspectionId_fkey" FOREIGN KEY ("responsableInspectionId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionHSE" ADD CONSTRAINT "InspectionHSE_relaisQHSEId_fkey" FOREIGN KEY ("relaisQHSEId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionHSE" ADD CONSTRAINT "InspectionHSE_chefChantierId_fkey" FOREIGN KEY ("chefChantierId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionHSE" ADD CONSTRAINT "ReponsePointInspectionHSE_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionHSE"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponsePointInspectionHSE" ADD CONSTRAINT "ReponsePointInspectionHSE_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "PointInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoInspectionHSE" ADD CONSTRAINT "PhotoInspectionHSE_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "InspectionHSE"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoInspectionHSE" ADD CONSTRAINT "PhotoInspectionHSE_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportHebdoQHSE" ADD CONSTRAINT "RapportHebdoQHSE_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportHebdoQHSE" ADD CONSTRAINT "RapportHebdoQHSE_relaisQHSEId_fkey" FOREIGN KEY ("relaisQHSEId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeSensibilisation" ADD CONSTRAINT "ProgrammeSensibilisation_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeSensibilisation" ADD CONSTRAINT "ProgrammeSensibilisation_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeanceSensibilisation" ADD CONSTRAINT "SeanceSensibilisation_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "ProgrammeSensibilisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PVSensibilisation" ADD CONSTRAINT "PVSensibilisation_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "SeanceSensibilisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PVSensibilisation" ADD CONSTRAINT "PVSensibilisation_serviceQHSEVisaId_fkey" FOREIGN KEY ("serviceQHSEVisaId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantPVSensibilisation" ADD CONSTRAINT "ParticipantPVSensibilisation_pvId_fkey" FOREIGN KEY ("pvId") REFERENCES "PVSensibilisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportIncident" ADD CONSTRAINT "RapportIncident_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportIncident" ADD CONSTRAINT "RapportIncident_reporteParId_fkey" FOREIGN KEY ("reporteParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportIncident" ADD CONSTRAINT "RapportIncident_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonneImpliqueeRapportIncident" ADD CONSTRAINT "PersonneImpliqueeRapportIncident_rapportIncidentId_fkey" FOREIGN KEY ("rapportIncidentId") REFERENCES "RapportIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionImmediateRapportIncident" ADD CONSTRAINT "ActionImmediateRapportIncident_rapportIncidentId_fkey" FOREIGN KEY ("rapportIncidentId") REFERENCES "RapportIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRapportIncident" ADD CONSTRAINT "CorrectionRapportIncident_rapportIncidentId_fkey" FOREIGN KEY ("rapportIncidentId") REFERENCES "RapportIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRapportIncident" ADD CONSTRAINT "PhotoRapportIncident_rapportIncidentId_fkey" FOREIGN KEY ("rapportIncidentId") REFERENCES "RapportIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoRapportIncident" ADD CONSTRAINT "PhotoRapportIncident_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_identificateurId_fkey" FOREIGN KEY ("identificateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_responsableMiseOeuvreId_fkey" FOREIGN KEY ("responsableMiseOeuvreId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_responsableQHSEId_fkey" FOREIGN KEY ("responsableQHSEId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_reponsePointInspectionHSEId_fkey" FOREIGN KEY ("reponsePointInspectionHSEId") REFERENCES "ReponsePointInspectionHSE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformite" ADD CONSTRAINT "NonConformite_rapportIncidentId_fkey" FOREIGN KEY ("rapportIncidentId") REFERENCES "RapportIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoNonConformite" ADD CONSTRAINT "PhotoNonConformite_nonConformiteId_fkey" FOREIGN KEY ("nonConformiteId") REFERENCES "NonConformite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoNonConformite" ADD CONSTRAINT "PhotoNonConformite_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
