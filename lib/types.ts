/** Tipos das entidades (espelham as colunas do schema em lib/db.ts). */

export interface Instrumento {
  id: number;
  nome: string;
  ordem: number;
}

export interface Local {
  id: number;
  nome: string;
  is_default: number;
  created_at: string;
}

export interface Integrante {
  id: number;
  nome: string;
  ativo: number;
  observacoes: string | null;
  created_at: string;
}

export interface Tema {
  id: number;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export type MusicaStatus = "inedita" | "consolidada" | "aposentada";

export interface Musica {
  id: number;
  nome: string;
  nome_normalizado: string;
  autor_compositor: string | null;
  is_percussao: number;
  is_coro: number;
  is_violao: number;
  is_acapella: number;
  status: MusicaStatus;
  letra: string | null;
  chordpro: string | null;
  cantor_habitual_id: number | null;
  tom_padrao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cerimonia {
  id: number;
  nome: string | null;
  data: string | null;
  local: string | null;
  observacoes: string | null;
  created_at: string;
}

export type ItemTipo = "musica" | "despacho";

export interface ItemCerimonia {
  id: number;
  cerimonia_id: number;
  momento_id: number | null;
  ordem: number;
  tipo: ItemTipo;
  musica_id: number | null;
  tom: string | null;
  capotraste: number | null;
  cantor_id: number | null;
  numero: number | null;
  cifra_snapshot: string | null;
  marcador: string | null;
  observacoes: string | null;
}
