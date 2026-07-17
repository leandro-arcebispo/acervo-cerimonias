/**
 * Roda o parser de import nos .docx de public/docs e imprime um resumo.
 * Uso: npx tsx scripts/test-parse.ts
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseDocx } from "../lib/import-parser";

const DIR = "public/docs";

async function main() {
  const arquivos = (await readdir(DIR)).filter((f) => f.endsWith(".docx"));

  for (const arq of arquivos) {
    const buf = await readFile(join(DIR, arq));
    const c = await parseDocx(buf, arq);

    console.log("\n" + "=".repeat(72));
    console.log(`ARQUIVO: ${arq}`);
    console.log(`  título: ${c.titulo}`);
    console.log(`  data:   ${c.data ?? "—"}`);
    console.log(`  partes: ${c.partes.length}  | músicas: ${c.musicas.length}  | pool: ${c.poolDespacho.length}`);
    console.log(`  temasHint: ${c.temasHint.join(", ") || "—"}`);
    if (c.avisos.length) console.log(`  avisos: ${c.avisos.join(" | ")}`);

    console.log("  partes detectadas:");
    for (const p of c.partes) {
      console.log(`    · ${p.titulo}${p.temasHint.length ? "  →temas: " + p.temasHint.join(", ") : ""}${p.despacho ? "  [" + p.despacho + "]" : ""}`);
    }

    console.log("  primeiras músicas:");
    for (const m of c.musicas.slice(0, 12)) {
      const tags = [
        m.tom ? "tom:" + m.tom : null,
        m.capotraste ? "cap:" + m.capotraste : null,
        m.isPercussao ? "percussão" : null,
        ...m.marcadores,
      ]
        .filter(Boolean)
        .join(" ");
      const quem = [...m.interpretes, ...m.instrumentos].join("/");
      console.log(`    ${String(m.numero).padStart(2)}. ${m.nome}  ${tags}${quem ? "  (" + quem + ")" : ""}`);
    }
    if (c.musicas.length > 12) console.log(`    … +${c.musicas.length - 12}`);

    if (c.poolDespacho.length) {
      console.log("  pool de despacho:");
      for (const m of c.poolDespacho) {
        console.log(`    - ${m.nome}${m.tom ? " (tom:" + m.tom + ")" : ""}${m.isPercussao ? " [percussão]" : ""}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
