import type { NiveauHierarchique, Prisma } from "@prisma/client";

export interface UpsertDemandeIndexInput {
  typeModule: string;
  sousModule: string;
  reference?: string | null;
  entiteType: string;
  entiteId: string;
  demandeurId: string;
  statutLibelle: string;
  montant?: Prisma.Decimal | number | string | null;
  enAttenteValidationDe?: NiveauHierarchique | null;
  enAttenteValidationUtilisateurId?: string | null;
  lienDetail?: string | null;
  dateSoumission: Date;
}
