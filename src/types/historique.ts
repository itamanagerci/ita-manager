export interface EnregistrerTransitionInput {
  entiteType: string;
  entiteId: string;
  statutPrecedent?: string;
  statutNouveau: string;
  acteurId: string;
  commentaire?: string;
}
