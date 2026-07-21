-- CreateTable
CREATE TABLE "DemandeIndex" (
    "id" TEXT NOT NULL,
    "typeModule" TEXT NOT NULL,
    "sousModule" TEXT NOT NULL,
    "reference" TEXT,
    "entiteType" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "statutLibelle" TEXT NOT NULL,
    "montant" DECIMAL(14,2),
    "enAttenteValidationDe" "NiveauHierarchique",
    "enAttenteValidationUtilisateurId" TEXT,
    "lienDetail" TEXT,
    "dateSoumission" TIMESTAMP(3) NOT NULL,
    "dateMaj" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeIndex_typeModule_idx" ON "DemandeIndex"("typeModule");

-- CreateIndex
CREATE INDEX "DemandeIndex_enAttenteValidationUtilisateurId_idx" ON "DemandeIndex"("enAttenteValidationUtilisateurId");

-- CreateIndex
CREATE INDEX "DemandeIndex_enAttenteValidationDe_idx" ON "DemandeIndex"("enAttenteValidationDe");

-- CreateIndex
CREATE INDEX "DemandeIndex_dateSoumission_idx" ON "DemandeIndex"("dateSoumission");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeIndex_entiteType_entiteId_key" ON "DemandeIndex"("entiteType", "entiteId");

-- AddForeignKey
ALTER TABLE "DemandeIndex" ADD CONSTRAINT "DemandeIndex_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeIndex" ADD CONSTRAINT "DemandeIndex_enAttenteValidationUtilisateurId_fkey" FOREIGN KEY ("enAttenteValidationUtilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
