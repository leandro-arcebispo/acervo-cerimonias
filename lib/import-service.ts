import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { all, get, run, nowIso } from "./db";
import { normalizar } from "./text";
import { parseDocx, type MusicaExtraida } from "./import-parser";
import { createMusica } from "./musicas";

const DOCS_DIR = join(process.cwd(), "public", "docs");

/** Aliases de tema conhecidos (rótulos dos arquivos → tema do acervo). */
const TEMA_ALIAS: Record<string, string> = {
  pg: "pomba gira",
  caboclos: "roda de caboclo",
  caboclo: "roda de caboclo",
};

export async function listArquivos(): Promise<string[]> {
  const files = await readdir(DOCS_DIR);
  return files.filter((f) => f.toLowerCase().endsWith(".docx")).sort();
}

interface Mapas {
  temaByNorm: Map<string, number>;
  integByNorm: Map<string, number>;
  musicaByNorm: Map<string, number>;
  localDefault: number | null;
}

async function carregarMapas(): Promise<Mapas> {
  const [temas, integ, mus, local] = await Promise.all([
    all<{ id: number; nome: string }>("SELECT id, nome FROM temas"),
    all<{ id: number; nome: string }>("SELECT id, nome FROM integrantes"),
    all<{ id: number; nome_normalizado: string }>(
      "SELECT id, nome_normalizado FROM musicas"
    ),
    get<{ id: number }>(
      "SELECT id FROM locais ORDER BY is_default DESC, id LIMIT 1"
    ),
  ]);
  return {
    temaByNorm: new Map(temas.map((t) => [normalizar(t.nome), t.id])),
    integByNorm: new Map(integ.map((i) => [normalizar(i.nome), i.id])),
    musicaByNorm: new Map(mus.map((m) => [m.nome_normalizado, m.id])),
    localDefault: local?.id ?? null,
  };
}

function mapTema(hint: string, m: Mapas): number | null {
  let n = normalizar(hint);
  if (TEMA_ALIAS[n]) n = TEMA_ALIAS[n];
  return m.temaByNorm.get(n) ?? null;
}

export interface PreviewMusica {
  nome: string;
  nomeNormalizado: string;
  existenteId: number | null;
  interpretes: string[];
  cantorId: number | null;
  instrumentos: string[];
  tom: string | null;
  capotraste: number | null;
  isPercussao: boolean;
  marcadores: string[];
  temaIds: number[];
  isDespachoPool: boolean;
  numero: number | null;
  parteIndex: number | null;
  cifraBruta: string | null;
}

export interface PreviewParte {
  titulo: string;
  temaIds: number[];
  despacho: string | null;
}

export interface Preview {
  arquivo: string;
  titulo: string;
  data: string | null;
  localId: number | null;
  temaIds: number[];
  partes: PreviewParte[];
  musicas: PreviewMusica[];
  poolDespacho: PreviewMusica[];
  integranteIds: number[];
  avisos: string[];
}

function enriquecer(mx: MusicaExtraida, temaIds: number[], m: Mapas): PreviewMusica {
  const nn = normalizar(mx.nome);
  const cantorId =
    mx.interpretes
      .map((i) => m.integByNorm.get(normalizar(i)))
      .find((x) => x != null) ?? null;
  return {
    nome: mx.nome,
    nomeNormalizado: nn,
    existenteId: m.musicaByNorm.get(nn) ?? null,
    interpretes: mx.interpretes,
    cantorId,
    instrumentos: mx.instrumentos,
    tom: mx.tom,
    capotraste: mx.capotraste,
    isPercussao: mx.isPercussao,
    marcadores: mx.marcadores,
    temaIds,
    isDespachoPool: mx.isDespachoPool,
    numero: mx.numero,
    parteIndex: mx.parteIndex,
    cifraBruta: mx.cifraBruta,
  };
}

export async function preview(arquivo: string): Promise<Preview> {
  const buf = await readFile(join(DOCS_DIR, arquivo));
  const c = await parseDocx(buf, arquivo);
  const m = await carregarMapas();

  const partes: PreviewParte[] = c.partes.map((p) => ({
    titulo: p.titulo,
    temaIds: p.temasHint
      .map((h) => mapTema(h, m))
      .filter((x): x is number => x != null),
    despacho: p.despacho,
  }));

  const tset = new Set<number>(partes.flatMap((p) => p.temaIds));
  const tituloNorm = normalizar(c.titulo);
  for (const [norm, id] of m.temaByNorm) {
    if (norm.length > 2 && tituloNorm.includes(norm)) tset.add(id);
  }
  const temaIdsCerimonia = [...tset];

  const musicas = c.musicas.map((mx) => {
    const pt =
      mx.parteIndex != null && partes[mx.parteIndex]
        ? partes[mx.parteIndex].temaIds
        : [];
    // Parte sem tema explícito → herda os temas da cerimônia.
    return enriquecer(mx, pt.length ? pt : temaIdsCerimonia, m);
  });
  const poolDespacho = c.poolDespacho.map((mx) => enriquecer(mx, [], m));

  const integ = new Set<number>();
  for (const mu of [...musicas, ...poolDespacho]) {
    if (mu.cantorId) integ.add(mu.cantorId);
  }

  return {
    arquivo: c.arquivo,
    titulo: c.titulo,
    data: c.data,
    localId: m.localDefault,
    temaIds: temaIdsCerimonia,
    partes,
    musicas,
    poolDespacho,
    integranteIds: [...integ],
    avisos: c.avisos,
  };
}

export interface CommitResult {
  cerimoniaId: number;
  musicasCriadas: number;
  musicasReusadas: number;
}

export async function commit(p: Preview): Promise<CommitResult> {
  const now = nowIso();
  const mapas = await carregarMapas();
  let musicasCriadas = 0;
  let musicasReusadas = 0;
  const idPorNorm = new Map<string, number>();

  async function garantirMusica(mu: PreviewMusica): Promise<number> {
    const nn = mu.nomeNormalizado || normalizar(mu.nome);
    const cache = idPorNorm.get(nn);
    if (cache) return cache;
    let id = mapas.musicaByNorm.get(nn) ?? mu.existenteId ?? null;
    if (id) {
      musicasReusadas++;
    } else {
      const nova = await createMusica({
        nome: mu.nome,
        is_percussao: mu.isPercussao ? 1 : 0,
        letra: mu.cifraBruta ?? null,
        cantor_habitual_id: mu.cantorId ?? null,
        temas: mu.temaIds,
      });
      id = nova.id;
      musicasCriadas++;
      mapas.musicaByNorm.set(nn, id);
    }
    idPorNorm.set(nn, id);
    return id;
  }

  const { lastId: cerimoniaId } = await run(
    "INSERT INTO cerimonias (nome, data, local_id, created_at) VALUES (@nome, @data, @local, @ca)",
    { nome: p.titulo, data: p.data, local: p.localId, ca: now }
  );

  for (const tid of p.temaIds) {
    await run(
      "INSERT OR IGNORE INTO cerimonia_temas (cerimonia_id, tema_id) VALUES (?, ?)",
      [cerimoniaId, tid]
    );
  }
  for (const iid of p.integranteIds) {
    await run(
      "INSERT OR IGNORE INTO cerimonia_integrantes (cerimonia_id, integrante_id) VALUES (?, ?)",
      [cerimoniaId, iid]
    );
  }

  const momentoIds: number[] = [];
  for (let i = 0; i < p.partes.length; i++) {
    const { lastId } = await run(
      "INSERT INTO momentos (cerimonia_id, ordem, titulo) VALUES (?, ?, ?)",
      [cerimoniaId, i, p.partes[i].titulo]
    );
    momentoIds.push(lastId);
    for (const tid of p.partes[i].temaIds) {
      await run(
        "INSERT OR IGNORE INTO momento_temas (momento_id, tema_id) VALUES (?, ?)",
        [lastId, tid]
      );
    }
  }

  let ordem = 0;
  let numero = 0;
  let ultimaParte: number | null = null;
  for (const mu of p.musicas) {
    const pi = mu.parteIndex;
    if (pi != null && pi !== ultimaParte) {
      ultimaParte = pi;
      const desp = p.partes[pi]?.despacho;
      if (desp) {
        await run(
          "INSERT INTO itens_cerimonia (cerimonia_id, momento_id, ordem, tipo, marcador) VALUES (?, ?, ?, 'despacho', ?)",
          [cerimoniaId, momentoIds[pi] ?? null, ordem++, desp]
        );
      }
    }
    const mid = await garantirMusica(mu);
    numero++;
    await run(
      `INSERT INTO itens_cerimonia
         (cerimonia_id, momento_id, ordem, tipo, musica_id, tom, capotraste, cantor_id, numero, marcador)
       VALUES (@c, @m, @o, 'musica', @mu, @tom, @cap, @cant, @num, @marc)`,
      {
        c: cerimoniaId,
        m: pi != null ? momentoIds[pi] ?? null : null,
        o: ordem++,
        mu: mid,
        tom: mu.tom,
        cap: mu.capotraste,
        cant: mu.cantorId,
        num: numero,
        marc: mu.marcadores[0] ?? null,
      }
    );
  }

  let po = 0;
  for (const mu of p.poolDespacho) {
    const mid = await garantirMusica(mu);
    await run(
      "INSERT INTO pool_despacho (cerimonia_id, musica_id, tom, ordem_sugerida) VALUES (?, ?, ?, ?)",
      [cerimoniaId, mid, mu.tom, po++]
    );
  }

  return { cerimoniaId, musicasCriadas, musicasReusadas };
}
