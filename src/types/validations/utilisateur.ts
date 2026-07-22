import { z } from "zod";

const niveauHierarchiqueEnum = z.enum(["DIRECTEUR", "CHEF_SERVICE", "AGENT"]);

export const creerCompteSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  email: z.string().email("Adresse email invalide"),
  telephone: z.string().optional().or(z.literal("")),
  niveauHierarchique: niveauHierarchiqueEnum,
  fonctionId: z.string().min(1, "La fonction est requise"),
});

export type CreerCompteInput = z.infer<typeof creerCompteSchema>;

export const modifierFonctionNiveauSchema = z.object({
  nouvelleFonctionId: z.string().min(1, "La fonction est requise"),
  nouveauNiveau: niveauHierarchiqueEnum,
});

export type ModifierFonctionNiveauInput = z.infer<typeof modifierFonctionNiveauSchema>;
