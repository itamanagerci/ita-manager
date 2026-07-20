export interface SousModuleNav {
  id: string;
  code: string;
  nom: string;
  ordre: number;
}

export interface ModuleNav {
  id: string;
  code: string;
  nom: string;
  icone: string | null;
  ordre: number;
  sousModules: SousModuleNav[];
}
