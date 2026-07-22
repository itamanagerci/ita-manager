import { z } from "zod";

export const creerDemandeCarburantSchema = z.object({
  vehiculeId: z.string().min(1, "Le véhicule est requis"),
  depotSourceId: z.string().min(1, "Le dépôt est requis"),
  kilometrageCompteur: z.number().int().positive("Kilométrage invalide"),
  quantiteDemandeeLitres: z.number().int().positive("Quantité invalide"),
  chantierMission: z.string().min(1, "Le chantier/mission est requis"),
});

export type CreerDemandeCarburantInput = z.infer<typeof creerDemandeCarburantSchema>;

export const reapprovisionnerSchema = z.object({
  depotId: z.string().min(1, "Le dépôt est requis"),
  quantiteLitres: z.number().int().positive("Quantité invalide"),
  fournisseur: z.string().min(1, "Le fournisseur est requis"),
});

export type ReapprovisionnerInput = z.infer<typeof reapprovisionnerSchema>;

export const refuserDemandeSchema = z.object({
  demandeId: z.string().min(1),
  motif: z.string().min(1, "Le motif est requis"),
});

export type RefuserDemandeInput = z.infer<typeof refuserDemandeSchema>;
