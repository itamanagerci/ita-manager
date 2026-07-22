import type { CategorieDocument } from "@prisma/client";
import type { Tonalite } from "@/components/ui/composed/statut-badge";

export const LABEL_CATEGORIE: Record<CategorieDocument, string> = {
  CONTRATS: "Contrats",
  RH: "RH",
  JURIDIQUE: "Juridique",
  FACTURES: "Factures",
  QHSE: "QHSE",
  ACHAT: "Achat",
  TECHNIQUE: "Technique",
  AUTRE: "Autre",
};

export const TONALITE_CATEGORIE: Record<CategorieDocument, Tonalite> = {
  CONTRATS: "neutre",
  RH: "attention",
  JURIDIQUE: "danger",
  FACTURES: "info",
  QHSE: "attention",
  ACHAT: "info",
  TECHNIQUE: "neutre",
  AUTRE: "neutre",
};
