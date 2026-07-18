/**
 * ChordPro simplificado: sintaxe de autoria `[Am]texto`, aceitando também linhas
 * só de acordes (progressão sem letra) e linhas em branco como separador de estrofe.
 * Sem diretivas `{...}` — só o essencial pro acervo.
 *
 * Pra caber no jeito que a cifra bruta do grupo já é escrita hoje (ver arquivos
 * importados), progressão sem letra aceita 3 formas, todas equivalentes:
 *   - um acorde por colchete: `[Am] [C] [G] [Dm]`
 *   - vários acordes num colchete só: `[Am C G Dm]`
 *   - sem colchete nenhum, linha só de acordes: `Am C G Dm` (detectado por heurística)
 */

export interface ChordChunk {
  chord: string | null;
  text: string;
}

export interface ChordProLine {
  chunks: ChordChunk[];
}

const CHORD_TOKEN = /\[([^\]]+)\]/g;

/** Ex.: Em7, FM7, C7M, Bsus2, Bdim, F/G, Bb7M. Heurística, não precisa ser exaustiva. */
const CHORD_LIKE =
  /^[A-G][#b]?(maj7|min7|dim7|sus2|sus4|add9|7M|M7|maj|min|dim|aug|m7|M|m|7|6|9|11|13|º)?(\/[A-G][#b]?)?$/;

/** ≥60% dos tokens da linha parecem acorde → trata a linha inteira como progressão. */
function ehLinhaSoAcordes(linha: string): boolean {
  const tokens = linha.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const acordes = tokens.filter((t) => CHORD_LIKE.test(t));
  return acordes.length / tokens.length >= 0.6;
}

/** Empilha os acordes pendentes de um colchete: todos com texto vazio, exceto o
 *  último, que leva o texto que vier a seguir (fora do colchete). */
function flush(chunks: ChordChunk[], pendentes: string[], texto: string) {
  if (pendentes.length === 0) {
    if (texto) chunks.push({ chord: null, text: texto });
    return;
  }
  for (let i = 0; i < pendentes.length - 1; i++) {
    chunks.push({ chord: pendentes[i], text: "" });
  }
  chunks.push({ chord: pendentes[pendentes.length - 1], text: texto });
}

/** Quebra uma linha em pedaços {acorde, texto-que-segue}. Linha sem colchetes vira 1 pedaço com chord=null,
 *  a menos que pareça ser só progressão de acordes soltos (sem colchete nenhum). */
function parseLinha(linha: string): ChordChunk[] {
  if (!linha.includes("[") && ehLinhaSoAcordes(linha)) {
    return linha
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((chord) => ({ chord, text: "" }));
  }

  const chunks: ChordChunk[] = [];
  let cursor = 0;
  let pendentes: string[] = [];
  CHORD_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHORD_TOKEN.exec(linha))) {
    flush(chunks, pendentes, linha.slice(cursor, m.index));
    const tokens = m[1].trim().split(/\s+/).filter(Boolean);
    pendentes = tokens.length ? tokens : [m[1]];
    cursor = CHORD_TOKEN.lastIndex;
  }
  flush(chunks, pendentes, linha.slice(cursor));
  return chunks;
}

/** Linhas em branco viram separador (chunks vazio); resto é parseado pedaço a pedaço. */
export function parseChordPro(fonte: string): ChordProLine[] {
  return fonte.split("\n").map((linha) => ({
    chunks: linha.trim() === "" ? [] : parseLinha(linha),
  }));
}

const NOTE_INDEX: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const FLAT_MAJOR_ROOTS = new Set([5, 10, 3, 8, 1, 6, 11]); // F Bb Eb Ab Db Gb Cb
const FLAT_MINOR_ROOTS = new Set([2, 7, 0, 5, 10, 3, 8]); // Dm Gm Cm Fm Bbm Ebm Abm

export function preferFlatSpelling(rootIndex: number, isMinor: boolean): boolean {
  return isMinor ? FLAT_MINOR_ROOTS.has(rootIndex) : FLAT_MAJOR_ROOTS.has(rootIndex);
}

function spellNote(index: number, preferFlat: boolean): string {
  const table = preferFlat ? FLAT_NAMES : SHARP_NAMES;
  return table[((index % 12) + 12) % 12];
}

/** Ex.: "Am7", "F#m", "C/E", "Bbmaj7". Não reconhece → devolve null. */
const CHORD_PARSE = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/;

export function transposeChord(chord: string, semitons: number, preferFlat: boolean): string {
  const m = chord.trim().match(CHORD_PARSE);
  if (!m) return chord;
  const [, rootLetter, rootAcc, qualidade, bassLetter, bassAcc] = m;
  const rootIdx = NOTE_INDEX[rootLetter + rootAcc];
  if (rootIdx === undefined) return chord;
  let resultado = spellNote(rootIdx + semitons, preferFlat) + qualidade;
  if (bassLetter) {
    const bassIdx = NOTE_INDEX[bassLetter + (bassAcc ?? "")];
    resultado +=
      "/" + (bassIdx !== undefined ? spellNote(bassIdx + semitons, preferFlat) : bassLetter + (bassAcc ?? ""));
  }
  return resultado;
}

export function transposeLines(
  linhas: ChordProLine[],
  semitons: number,
  preferFlat: boolean
): ChordProLine[] {
  return linhas.map((linha) => ({
    chunks: linha.chunks.map((c) =>
      c.chord ? { chord: transposeChord(c.chord, semitons, preferFlat), text: c.text } : c
    ),
  }));
}

/** Extrai só a tônica (ignora qualidade/extensão) de um texto livre de tom, ex. "Am7" → A menor. */
export function parseTomRoot(tom: string): { rootIndex: number; isMinor: boolean } | null {
  const m = tom.trim().match(/^([A-G])([#b]?)/);
  if (!m) return null;
  const rootIdx = NOTE_INDEX[m[1] + m[2]];
  if (rootIdx === undefined) return null;
  const resto = tom.trim().slice(m[0].length);
  const isMinor = /^m(?!aj)/i.test(resto);
  return { rootIndex: rootIdx, isMinor };
}

/** Diferença em semitons de tomBase pra tomDestino (0-11), ou null se algum não for reconhecido. */
export function semitonesEntre(
  tomBase: string | null | undefined,
  tomDestino: string | null | undefined
): number | null {
  if (!tomBase || !tomDestino) return null;
  const base = parseTomRoot(tomBase);
  const destino = parseTomRoot(tomDestino);
  if (!base || !destino) return null;
  return (destino.rootIndex - base.rootIndex + 12) % 12;
}
