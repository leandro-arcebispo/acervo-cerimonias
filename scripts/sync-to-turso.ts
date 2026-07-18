/**
 * Copia schema + dados do banco local (data/acervo.db) pro banco remoto
 * (Turso), sem passar pelo init()/seed do app — evita duplicar os dados de
 * seed (instrumentos/temas/locais/integrantes) por cima dos dados reais.
 *
 * Requer TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no ambiente (ex.: em
 * `.env.local`, ou exportadas na shell antes de rodar).
 *
 * Uso: `npx tsx scripts/sync-to-turso.ts`
 *
 * Idempotente o suficiente pra dev (roda `CREATE TABLE/INDEX IF NOT EXISTS`),
 * mas foi pensado pra rodar uma vez, contra um banco remoto vazio. Rodar de
 * novo depois de já ter dados no remoto vai duplicar linhas.
 */
import { createClient } from "@libsql/client";

const TABELAS_EM_ORDEM = [
  "settings",
  "instrumentos",
  "locais",
  "integrantes",
  "integrante_instrumentos",
  "temas",
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

  // 1) Schema: recria cada tabela/índice no remoto exatamente como está no
  //    local agora (sqlite_master já reflete colunas adicionadas via
  //    migrarColunas — não depende do texto original do CREATE TABLE).
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

  for (const tabela of TABELAS_EM_ORDEM) {
    const ddl = ddlPorTabela.get(tabela);
    if (!ddl) continue;
    await remote.execute(ddl);
  }
  for (const ddl of indices) {
    await remote.execute(ddl);
  }
  console.log(`Schema recriado (${ddlPorTabela.size} tabelas, ${indices.length} índices).\n`);

  // 2) Dados: copia linha a linha, preservando os ids (FKs dependem disso).
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
