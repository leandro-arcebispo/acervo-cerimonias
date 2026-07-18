/**
 * Copia schema + dados do banco local (data/acervo.db) pro banco remoto
 * (Turso), sem passar pelo init()/seed do app.
 *
 * O primeiro acesso do app a um banco Turso novo já roda o init() dele e
 * semeia instrumentos/temas/locais/integrantes "de fábrica" (SEED_*) — então
 * o remoto normalmente NÃO está vazio quando você for sincronizar, só não
 * tem os dados reais ainda. Este script:
 *   1. Confere que as tabelas de dados reais (tudo fora do seed) estão
 *      zeradas no remoto — aborta se não estiverem (proteção contra apagar
 *      dado de produção por engano).
 *   2. Garante o schema (cria o que faltar; ignora "already exists").
 *   3. Limpa as tabelas de seed no remoto (senão a cópia bate de frente com
 *      as UNIQUE constraints dos nomes já semeados) e as demais (por
 *      simetria — já confirmamos que estão vazias no passo 1).
 *   4. Copia linha a linha do local pro remoto, preservando os ids (as FKs
 *      dependem disso).
 *
 * Requer TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no ambiente (não precisa
 * estar em `.env.local` — passe na hora, ex. `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/sync-to-turso.ts`).
 *
 * Uso: `npm run db:sync-turso`
 */
import { createClient } from "@libsql/client";

const TABELAS_SEED = [
  "instrumentos",
  "locais",
  "integrantes",
  "integrante_instrumentos",
  "temas",
];

const TABELAS_EM_ORDEM = [
  "settings",
  ...TABELAS_SEED,
  "musicas",
  "musica_temas",
  "musica_tons",
  "maestria_voz",
  "musica_versoes",
  "cerimonias",
  "cerimonia_temas",
  "momentos",
  "momento_temas",
  "cerimonia_integrantes",
  "itens_cerimonia",
  "item_cantores",
  "pool_despacho",
  "audios",
  "import_lotes",
  "import_itens",
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isAlreadyExists(err: unknown): boolean {
  return String(err instanceof Error ? err.message : err).includes("already exists");
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no ambiente antes de rodar."
    );
  }

  const local = createClient({ url: "file:./data/acervo.db", intMode: "number" });
  const remote = createClient({ url, authToken, intMode: "number" });

  console.log(`Origem:  file:./data/acervo.db`);
  console.log(`Destino: ${url}\n`);

  const objetos = await local.execute(
    `SELECT type, name, sql FROM sqlite_master
      WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'`
  );
  const ddlPorTabela = new Map<string, string>();
  const indices: string[] = [];
  for (const row of objetos.rows) {
    const type = String(row[0]);
    const name = String(row[1]);
    const sql = String(row[2]);
    if (type === "table") ddlPorTabela.set(name, sql);
    else indices.push(sql);
  }

  // 1) Proteção: se o remoto já existe, ele foi tocado pelo init() do app
  //    (seed de fábrica). Confirma que não há dado REAL lá antes de limpar.
  const naoSeed = TABELAS_EM_ORDEM.filter(
    (t) => t !== "settings" && !TABELAS_SEED.includes(t)
  );
  for (const tabela of naoSeed) {
    if (!ddlPorTabela.has(tabela)) continue;
    let n = 0;
    try {
      const rs = await remote.execute(`SELECT COUNT(*) AS n FROM ${tabela}`);
      n = Number(rs.rows[0][0]);
    } catch {
      continue; // tabela não existe no remoto ainda — ok, será criada.
    }
    if (n > 0) {
      throw new Error(
        `Abortando: "${tabela}" já tem ${n} linha(s) no remoto — não é um banco ` +
          `"só com seed de fábrica". Sincronizar por cima apagaria dado real.`
      );
    }
  }
  console.log("Remoto confirmado sem dado real (só seed de fábrica ou vazio).\n");

  // 2) Schema: cria o que faltar (tabelas/índices já existentes são ignorados).
  for (const tabela of TABELAS_EM_ORDEM) {
    const ddl = ddlPorTabela.get(tabela);
    if (!ddl) continue;
    try {
      await remote.execute(ddl);
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }
  for (const ddl of indices) {
    try {
      await remote.execute(ddl);
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }
  console.log(`Schema garantido (${ddlPorTabela.size} tabelas, ${indices.length} índices).\n`);

  // 3) Limpa tudo no remoto (filhas → pais) antes de copiar do local.
  for (const tabela of [...TABELAS_EM_ORDEM].reverse()) {
    if (!ddlPorTabela.has(tabela)) continue;
    await remote.execute(`DELETE FROM ${tabela}`);
  }
  await remote.execute("DELETE FROM sqlite_sequence").catch(() => {});
  console.log("Tabelas do remoto limpas.\n");

  // 4) Copia os dados do local, preservando ids.
  for (const tabela of TABELAS_EM_ORDEM) {
    if (!ddlPorTabela.has(tabela)) continue;
    const rs = await local.execute(`SELECT * FROM ${tabela}`);
    if (rs.rows.length === 0) {
      console.log(`  - ${tabela.padEnd(24)} 0 linhas`);
      continue;
    }
    const cols = rs.columns;
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO ${tabela} (${cols.join(", ")}) VALUES (${placeholders})`;

    for (const grupo of chunk(rs.rows, 100)) {
      await remote.batch(
        grupo.map((row) => ({ sql, args: cols.map((_, i) => row[i]) })),
        "write"
      );
    }
    console.log(`  - ${tabela.padEnd(24)} ${rs.rows.length} linhas`);
  }

  console.log("\nSincronização concluída.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
