/**
 * Cria o schema, roda o seed (idempotente) e imprime um resumo.
 * Uso: `npm run db:init`
 */
import { getClient, all } from "../lib/db";

async function count(tabela: string): Promise<number> {
  const rows = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`);
  return rows[0]?.n ?? 0;
}

async function main() {
  await getClient(); // dispara schema + seed

  const tabelas = [
    "instrumentos",
    "temas",
    "locais",
    "integrantes",
    "integrante_instrumentos",
    "musicas",
    "cerimonias",
  ];

  console.log("\n  Banco inicializado. Contagens:");
  for (const t of tabelas) {
    console.log(`   - ${t.padEnd(24)} ${await count(t)}`);
  }

  const integrantes = await all<{ nome: string; instrumentos: string | null }>(`
    SELECT i.nome, GROUP_CONCAT(ins.nome, ', ') AS instrumentos
    FROM integrantes i
    LEFT JOIN integrante_instrumentos ii ON ii.integrante_id = i.id
    LEFT JOIN instrumentos ins ON ins.id = ii.instrumento_id
    GROUP BY i.id
    ORDER BY i.id
  `);

  console.log("\n  Integrantes:");
  for (const it of integrantes) {
    console.log(`   - ${it.nome.padEnd(12)} ${it.instrumentos ?? "(sem instrumento)"}`);
  }

  const temas = await all<{ nome: string }>("SELECT nome FROM temas ORDER BY id");
  console.log("\n  Temas: " + temas.map((t) => t.nome).join(", ") + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
