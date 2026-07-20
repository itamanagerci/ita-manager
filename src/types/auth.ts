import type { Fonction, NiveauHierarchique, StatutUtilisateur } from "@prisma/client";

export interface UtilisateurCourant {
  id: string;
  authUserId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  niveauHierarchique: NiveauHierarchique;
  statut: StatutUtilisateur;
  premiereConnexion: boolean;
  fonction: Fonction;
}
