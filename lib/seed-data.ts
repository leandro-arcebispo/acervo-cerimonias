/**
 * Dados do seed inicial (ver SEED.md). Validados pelo usuário; erros pontuais
 * serão corrigidos depois via CRUD. Instrumentos é um enum fixo; temas, locais e
 * integrantes só são inseridos quando a tabela está vazia (idempotente).
 */

export const SEED_INSTRUMENTOS = [
  "Voz",
  "Violão",
  "Violoncelo",
  "Percussão",
  "Teclado",
  "Guitarra",
  "Baixo",
  "Violino",
] as const;

export const SEED_TEMAS = [
  "Sertão",
  "Oriental",
  "Pachamama",
  "Roda de Caboclo",
  "Pretos Velhos",
  "Águas",
  "Onã",
  "Cigana",
  "Exu",
  "Pomba Gira",
  "Ogum",
  "Iansã",
  "Oxóssi",
  "Boiadeiros",
  "Oxumaré",
  "Logunedé",
  "Oxalá",
  "Nanã",
  "Obaluaiê",
  "Erê",
  "Oxum",
  "Iemanjá",
] as const;

export const SEED_LOCAIS = [{ nome: "Casa de Cura", isDefault: true }] as const;

export type SeedIntegrante = { nome: string; instrumentos: string[] };

export const SEED_INTEGRANTES: SeedIntegrante[] = [
  { nome: "Jéssica", instrumentos: ["Voz", "Violão", "Percussão"] },
  { nome: "Bruno", instrumentos: ["Voz", "Violão"] },
  { nome: "Bárbara", instrumentos: ["Voz", "Violão", "Violino", "Percussão"] },
  { nome: "Diego", instrumentos: ["Voz", "Violão"] },
  { nome: "Wilson", instrumentos: ["Voz", "Violão"] },
  { nome: "Stephany", instrumentos: ["Voz", "Violão"] },
  { nome: "Ary", instrumentos: ["Voz", "Violão", "Percussão"] },
  { nome: "Geraldo", instrumentos: ["Voz", "Violão"] },
  { nome: "Gabruga", instrumentos: ["Teclado"] },
];
