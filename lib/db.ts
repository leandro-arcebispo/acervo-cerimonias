import { createClient, type Client, type InArgs, type Row } from "@libsql/client";
import {
  SEED_INSTRUMENTOS,
  SEED_TEMAS,
  SEED_LOCAIS,
  SEED_INTEGRANTES,
} from "./seed-data";

/**
 * Conexão libSQL (Turso em produção; arquivo local em dev).
 * - **Produção:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.
 * - **Dev:** sem essas vars, cai para `file:./data/acervo.db`, então dá pra
 *   rodar/testar local sem nenhuma conta na nuvem.
 *
 * O schema é criado (IF NOT EXISTS) e os dados base semeados na primeira conexão.
 */

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function rawClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || "file:./data/acervo.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  _client = createClient(
    authToken ? { url, authToken, intMode: "number" } : { url, intMode: "number" }
  );
  return _client;
}

/** Cliente pronto (schema + seed garantidos). Prefira os helpers `all/get/run`. */
export async function getClient(): Promise<Client> {
  const c = rawClient();
  if (!_ready) _ready = init(c);
  await _ready;
  return c;
}

function rowToObject<T>(columns: string[], row: Row): T {
  const o: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) o[columns[i]] = row[i];
  return o as T;
}

/** SELECT → array de objetos planos (serializáveis em JSON). */
export async function all<T>(sql: string, args?: InArgs): Promise<T[]> {
  const db = await getClient();
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return rs.rows.map((r) => rowToObject<T>(rs.columns, r));
}

/** SELECT de uma linha (ou undefined). */
export async function get<T>(sql: string, args?: InArgs): Promise<T | undefined> {
  const rows = await all<T>(sql, args);
  return rows[0];
}

/** INSERT/UPDATE/DELETE → { lastId, changes }. */
export async function run(
  sql: string,
  args?: InArgs
): Promise<{ lastId: number; changes: number }> {
  const db = await getClient();
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return {
    lastId: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
    changes: rs.rowsAffected,
  };
}

async function init(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA);
  await migrarColunas(db);
  await seedInstrumentos(db);
  await seedTemas(db);
  await seedLocais(db);
  await seedIntegrantes(db);
}

/** Colunas adicionadas depois do CREATE TABLE inicial (sem framework de migrations). */
async function migrarColunas(db: Client): Promise<void> {
  const rs = await db.execute("PRAGMA table_info(musicas)");
  const colunas = new Set(rs.rows.map((r) => String(r[1])));
  const novas: Array<[string, string]> = [
    ["tom_padrao", "TEXT"],
    ["is_coro", "INTEGER NOT NULL DEFAULT 0"],
    ["is_violao", "INTEGER NOT NULL DEFAULT 0"],
    ["is_acapella", "INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [nome, tipo] of novas) {
    if (!colunas.has(nome)) {
      await db.execute(`ALTER TABLE musicas ADD COLUMN ${nome} ${tipo}`);
    }
  }

  const rsCerimonias = await db.execute("PRAGMA table_info(cerimonias)");
  const colunasCerimonias = new Set(rsCerimonias.rows.map((r) => String(r[1])));
  if (!colunasCerimonias.has("local")) {
    // "Local" virou campo de texto livre — antes era FK pra tabela locais.
    await db.execute("ALTER TABLE cerimonias ADD COLUMN local TEXT");
    await db.execute(
      `UPDATE cerimonias SET local = (SELECT nome FROM locais WHERE id = cerimonias.local_id)
        WHERE local_id IS NOT NULL`
    );
  }
}

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  -- Config chave/valor (uso futuro).
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- ===== Cadastros base =====

  CREATE TABLE IF NOT EXISTS instrumentos (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome  TEXT NOT NULL COLLATE NOCASE UNIQUE,
    ordem INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS locais (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL COLLATE NOCASE UNIQUE,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS integrantes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    ativo       INTEGER NOT NULL DEFAULT 1,
    observacoes TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS integrante_instrumentos (
    integrante_id INTEGER NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
    instrumento_id INTEGER NOT NULL REFERENCES instrumentos(id) ON DELETE CASCADE,
    PRIMARY KEY (integrante_id, instrumento_id)
  );

  CREATE TABLE IF NOT EXISTS temas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao  TEXT,
    created_at TEXT NOT NULL
  );

  -- ===== Músicas =====

  CREATE TABLE IF NOT EXISTS musicas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    nome               TEXT NOT NULL,
    nome_normalizado   TEXT NOT NULL,
    autor_compositor   TEXT,
    is_percussao       INTEGER NOT NULL DEFAULT 0,
    is_coro            INTEGER NOT NULL DEFAULT 0,
    is_violao          INTEGER NOT NULL DEFAULT 0,
    is_acapella        INTEGER NOT NULL DEFAULT 0,
    status             TEXT NOT NULL DEFAULT 'consolidada',
    letra              TEXT,
    chordpro           TEXT,
    cantor_habitual_id INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
    tom_padrao         TEXT,
    observacoes        TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS musica_temas (
    musica_id INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
    tema_id   INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    PRIMARY KEY (musica_id, tema_id)
  );

  -- Tons conhecidos de uma música sem vínculo com cerimônia (entrada manual).
  CREATE TABLE IF NOT EXISTS musica_tons (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    musica_id INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
    tom       TEXT NOT NULL,
    UNIQUE (musica_id, tom)
  );

  -- Maestria vocal: integrante (voz) ↔ música.
  CREATE TABLE IF NOT EXISTS maestria_voz (
    integrante_id INTEGER NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
    musica_id     INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
    PRIMARY KEY (integrante_id, musica_id)
  );

  -- Histórico de versões de letra/cifra da música.
  CREATE TABLE IF NOT EXISTS musica_versoes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    musica_id  INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
    letra      TEXT,
    chordpro   TEXT,
    nota       TEXT,
    editado_em TEXT NOT NULL
  );

  -- ===== Cerimônias =====

  CREATE TABLE IF NOT EXISTS cerimonias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT,
    data        TEXT,
    local_id    INTEGER REFERENCES locais(id) ON DELETE SET NULL,
    observacoes TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cerimonia_temas (
    cerimonia_id INTEGER NOT NULL REFERENCES cerimonias(id) ON DELETE CASCADE,
    tema_id      INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    PRIMARY KEY (cerimonia_id, tema_id)
  );

  -- Momentos/PARTES da cerimônia (agrupam itens; podem ter tema próprio).
  CREATE TABLE IF NOT EXISTS momentos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    cerimonia_id INTEGER NOT NULL REFERENCES cerimonias(id) ON DELETE CASCADE,
    ordem        INTEGER NOT NULL DEFAULT 0,
    titulo       TEXT
  );

  CREATE TABLE IF NOT EXISTS momento_temas (
    momento_id INTEGER NOT NULL REFERENCES momentos(id) ON DELETE CASCADE,
    tema_id    INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    PRIMARY KEY (momento_id, tema_id)
  );

  -- Quem participou (+ instrumento naquela cerimônia).
  CREATE TABLE IF NOT EXISTS cerimonia_integrantes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cerimonia_id  INTEGER NOT NULL REFERENCES cerimonias(id) ON DELETE CASCADE,
    integrante_id INTEGER NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
    instrumento_id INTEGER REFERENCES instrumentos(id) ON DELETE SET NULL,
    UNIQUE (cerimonia_id, integrante_id, instrumento_id)
  );

  -- Sequência ordenada da cerimônia: músicas e marcadores de despacho.
  -- 'numero' é calculado (só itens tipo=musica que não são do pool).
  CREATE TABLE IF NOT EXISTS itens_cerimonia (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cerimonia_id   INTEGER NOT NULL REFERENCES cerimonias(id) ON DELETE CASCADE,
    momento_id     INTEGER REFERENCES momentos(id) ON DELETE SET NULL,
    ordem          INTEGER NOT NULL DEFAULT 0,
    tipo           TEXT NOT NULL DEFAULT 'musica',   -- 'musica' | 'despacho'
    musica_id      INTEGER REFERENCES musicas(id) ON DELETE SET NULL,
    tom            TEXT,
    capotraste     INTEGER,
    cantor_id      INTEGER REFERENCES integrantes(id) ON DELETE SET NULL,
    numero         INTEGER,
    cifra_snapshot TEXT,
    marcador       TEXT,                              -- 'ponto' | 'bis' | 'defumacao' ...
    observacoes    TEXT
  );

  -- Cantores de um item (uma música pode ter mais de um). 'cantor_id' em
  -- itens_cerimonia fica mantido só como compatibilidade com dados antigos.
  CREATE TABLE IF NOT EXISTS item_cantores (
    item_id       INTEGER NOT NULL REFERENCES itens_cerimonia(id) ON DELETE CASCADE,
    integrante_id INTEGER NOT NULL REFERENCES integrantes(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, integrante_id)
  );

  -- Pool de despacho: músicas soltas (sem numeração) pra escolher na hora.
  CREATE TABLE IF NOT EXISTS pool_despacho (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cerimonia_id   INTEGER NOT NULL REFERENCES cerimonias(id) ON DELETE CASCADE,
    musica_id      INTEGER NOT NULL REFERENCES musicas(id) ON DELETE CASCADE,
    tom            TEXT,
    ordem_sugerida INTEGER NOT NULL DEFAULT 0
  );

  -- ===== Áudio (Fase 6) =====
  CREATE TABLE IF NOT EXISTS audios (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    cerimonia_id      INTEGER REFERENCES cerimonias(id) ON DELETE CASCADE,
    item_cerimonia_id INTEGER REFERENCES itens_cerimonia(id) ON DELETE CASCADE,
    musica_id         INTEGER REFERENCES musicas(id) ON DELETE CASCADE,
    tipo              TEXT NOT NULL DEFAULT 'drive_link', -- 'drive_link' | 'upload'
    url_ou_blob       TEXT NOT NULL,
    formato           TEXT,
    observacoes       TEXT,
    created_at        TEXT NOT NULL
  );

  -- ===== Import (staging) =====
  CREATE TABLE IF NOT EXISTS import_lotes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo_nome TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pendente',
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS import_itens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lote_id         INTEGER NOT NULL REFERENCES import_lotes(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL DEFAULT 'musica',
    dados_extraidos TEXT NOT NULL DEFAULT '{}',
    match_musica_id INTEGER REFERENCES musicas(id) ON DELETE SET NULL,
    resolvido       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
  );

  -- ===== Índices =====
  CREATE INDEX IF NOT EXISTS idx_integrantes_ativo ON integrantes(ativo);
  CREATE INDEX IF NOT EXISTS idx_musicas_nome_norm ON musicas(nome_normalizado);
  CREATE INDEX IF NOT EXISTS idx_musica_temas_tema ON musica_temas(tema_id);
  CREATE INDEX IF NOT EXISTS idx_cerimonias_data ON cerimonias(data);
  CREATE INDEX IF NOT EXISTS idx_itens_cerimonia ON itens_cerimonia(cerimonia_id, ordem);
  CREATE INDEX IF NOT EXISTS idx_pool_cerimonia ON pool_despacho(cerimonia_id);
  CREATE INDEX IF NOT EXISTS idx_item_cantores_item ON item_cantores(item_id);
`;

export function nowIso(): string {
  return new Date().toISOString();
}

async function seedInstrumentos(db: Client): Promise<void> {
  const rs = await db.execute("SELECT COUNT(*) AS n FROM instrumentos");
  if (Number(rs.rows[0][0]) > 0) return;
  await db.batch(
    SEED_INSTRUMENTOS.map((nome, i) => ({
      sql: "INSERT INTO instrumentos (nome, ordem) VALUES (?, ?)",
      args: [nome, i],
    })),
    "write"
  );
}

async function seedTemas(db: Client): Promise<void> {
  const rs = await db.execute("SELECT COUNT(*) AS n FROM temas");
  if (Number(rs.rows[0][0]) > 0) return;
  const now = nowIso();
  await db.batch(
    SEED_TEMAS.map((nome) => ({
      sql: "INSERT INTO temas (nome, created_at) VALUES (?, ?)",
      args: [nome, now],
    })),
    "write"
  );
}

async function seedLocais(db: Client): Promise<void> {
  const rs = await db.execute("SELECT COUNT(*) AS n FROM locais");
  if (Number(rs.rows[0][0]) > 0) return;
  const now = nowIso();
  await db.batch(
    SEED_LOCAIS.map((l) => ({
      sql: "INSERT INTO locais (nome, is_default, created_at) VALUES (?, ?, ?)",
      args: [l.nome, l.isDefault ? 1 : 0, now],
    })),
    "write"
  );
}

async function seedIntegrantes(db: Client): Promise<void> {
  const rs = await db.execute("SELECT COUNT(*) AS n FROM integrantes");
  if (Number(rs.rows[0][0]) > 0) return;

  const instRs = await db.execute("SELECT id, nome FROM instrumentos");
  const instMap = new Map<string, number>(
    instRs.rows.map((r) => [String(r[1]), Number(r[0])])
  );
  const now = nowIso();

  for (const it of SEED_INTEGRANTES) {
    const res = await db.execute({
      sql: "INSERT INTO integrantes (nome, ativo, created_at) VALUES (?, 1, ?)",
      args: [it.nome, now],
    });
    const integranteId = Number(res.lastInsertRowid);
    for (const instNome of it.instrumentos) {
      const instId = instMap.get(instNome);
      if (instId !== undefined) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO integrante_instrumentos (integrante_id, instrumento_id) VALUES (?, ?)",
          args: [integranteId, instId],
        });
      }
    }
  }
}
