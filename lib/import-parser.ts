import JSZip from "jszip";

/**
 * Parser heurístico dos arquivos .docx de cerimônia do grupo.
 * Baseado na análise das amostras (ver PLANEJAMENTO.md). É best-effort: produz
 * uma extração estruturada que DEPOIS passa por revisão humana (staging) antes de
 * virar registros no acervo. Não tenta acertar 100% — sinaliza o que achou.
 */

export interface MusicaExtraida {
  numero: number | null;
  nome: string;
  interpretes: string[];
  instrumentos: string[];
  tom: string | null;
  capotraste: number | null;
  isPercussao: boolean;
  marcadores: string[];
  isDespachoPool: boolean;
  parteIndex: number | null;
  cifraBruta: string | null;
}

export interface ParteExtraida {
  titulo: string;
  temasHint: string[];
  despacho: string | null;
}

export interface CerimoniaExtraida {
  arquivo: string;
  titulo: string;
  data: string | null;
  partes: ParteExtraida[];
  musicas: MusicaExtraida[];
  poolDespacho: MusicaExtraida[];
  temasHint: string[];
  avisos: string[];
}

const INSTRUMENTOS_KW: Array<[RegExp, string]> = [
  [/viol[ãa]o/i, "Violão"],
  [/violino/i, "Violino"],
  [/violoncelo/i, "Violoncelo"],
  [/percuss[ãa]o/i, "Percussão"],
  [/teclado/i, "Teclado"],
  [/guitarra/i, "Guitarra"],
  [/baixo/i, "Baixo"],
  [/\bvoz\b/i, "Voz"],
];

const ROLE_STRIP =
  /\b(puxa|puxam|coro|todos|todas|din[âa]mica|acapel?la|melod[íi]a|contrapontos|resposta|grad(ual|ativo)|solo|inst|intro|refr[ãa]o|verso|entra|final|suave|bem|na|no|nas|nos|da|do|de|em|com|pra|para|segunda|terceira|primeira)\b/gi;

const PERFORMER_HINT = /\b(puxa|puxam|coro|todos|todas)\b/i;

const CHORD = /^[A-G][#b]?(m|maj|min|M)?(7M|7|6|9|11|13|dim|aug|sus2|sus4|º)?$/;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function extrairTexto(
  buf: Buffer | ArrayBuffer | Uint8Array
): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("document.xml não encontrado no .docx");
  let xml = await doc.async("string");
  xml = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br[^>]*\/?>/g, "\n")
    .replace(/<w:tab[^>]*\/?>/g, " ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(xml);
}

function ehLinhaAcordes(linha: string): boolean {
  let t = linha.trim();
  if (!t) return false;
  t = t.replace(/^[[(]/, "").replace(/[)\]]$/, "").trim();
  const tokens = t.split(/[\s\-–|,]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const acordes = tokens.filter((tk) =>
    CHORD.test(tk.replace(/[[\]()|,.]/g, ""))
  ).length;
  return acordes >= Math.max(1, Math.ceil(tokens.length * 0.6));
}

/** Extrai tom/capo/marcadores de uma linha-título e devolve o nome limpo. */
function limparNome(bruto: string): {
  nome: string;
  tom: string | null;
  capotraste: number | null;
  marcadores: string[];
  isPercussao: boolean;
} {
  let s = bruto.trim();
  const marcadores: string[] = [];
  let tom: string | null = null;
  let capotraste: number | null = null;
  let isPercussao = false;

  const capM = s.match(/\bcap\.?\s*(\d)\b/i);
  if (capM) {
    capotraste = Number(capM[1]);
    s = s.replace(capM[0], " ");
  }
  if (/percuss[ãa]o/i.test(s)) {
    isPercussao = true;
    s = s.replace(/[-–]?\s*percuss[ãa]o/i, " ");
  }
  if (/\(?\bponto\b\)?/i.test(s)) {
    marcadores.push("ponto");
    s = s.replace(/\(?\bponto\b\)?/i, " ");
  }
  if (s.includes("*")) {
    marcadores.push("destaque");
    s = s.replace(/\*/g, " ");
  }
  // Tom só quando é um ÚNICO acorde entre parênteses no fim: "(Dm)", "(C )"
  const parM = s.match(/\(\s*([A-G][#b]?\S{0,5})\s*\)\s*$/);
  if (parM && CHORD.test(parM[1].trim())) {
    tom = parM[1].trim();
    s = s.slice(0, parM.index).trim();
  }
  // Tom com "- AM" / "– Am" no fim (um acorde só)
  if (!tom) {
    const dashM = s.match(/[-–]\s*([A-G][#b]?\S{0,4})\s*$/);
    if (dashM && CHORD.test(dashM[1].trim())) {
      tom = dashM[1].trim();
      s = s.slice(0, dashM.index).trim();
    }
  }
  // Tom solto no fim sem traço, ex. "REZA REZADOR Gm" — só quando o token tem
  // qualificador (m, 7, dim...), pra não confundir uma letra solta com o tom.
  if (!tom) {
    const spaceM = s.match(/\s([A-G][#b]?(?:m|maj|min|M)(?:7M|7|6|9|11|13|dim|aug|sus2|sus4|º)?)\s*$/);
    if (spaceM && CHORD.test(spaceM[1])) {
      tom = spaceM[1];
      s = s.slice(0, spaceM.index).trim();
    }
  }

  s = s.replace(/\s{2,}/g, " ").replace(/^[\s\-–.]+|[\s\-–.]+$/g, "").trim();
  if (tom) tom = tom.charAt(0).toUpperCase() + tom.slice(1);

  return { nome: s, tom, capotraste, marcadores, isPercussao };
}

function parseInterpretes(linhaParen: string): {
  interpretes: string[];
  instrumentos: string[];
} {
  const inner = linhaParen.replace(/^\s*\(/, "").replace(/\)\s*$/, "");
  const instrumentos = new Set<string>();
  for (const [re, nome] of INSTRUMENTOS_KW) if (re.test(inner)) instrumentos.add(nome);

  const interpretes: string[] = [];
  for (let p of inner.split(/[–\-/,]|\be\b/i)) {
    p = p.trim();
    if (!p) continue;
    for (const [re] of INSTRUMENTOS_KW) p = p.replace(re, " ");
    p = p.replace(ROLE_STRIP, " ").replace(/\d+\s*x/gi, " ").trim();
    const m = p.match(/^[\p{L}][\p{L}\s]*/u);
    const nome = (m ? m[0] : "").trim();
    if (!nome || CHORD.test(nome)) continue;
    if (
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÀ]/u.test(nome) &&
      nome.split(/\s+/).length <= 2 &&
      nome.length <= 18
    ) {
      interpretes.push(nome);
    }
  }
  return { interpretes: [...new Set(interpretes)], instrumentos: [...instrumentos] };
}

function parseData(linhas: string[]): string | null {
  for (const l of linhas.slice(0, 6)) {
    const m = l.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
    if (m) {
      const [, d, mo, y] = m;
      const ano = y.length === 2 ? "20" + y : y;
      return `${ano}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
}

function parseTemasDoTitulo(titulo: string): string[] {
  const idx = titulo.search(/[-–]/);
  if (idx === -1) return [];
  return titulo
    .slice(idx + 1)
    .split(/[/,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function extrairInlineParen(resto: string): {
  resto: string;
  inline: string | null;
} {
  const pIdx = resto.indexOf("(");
  if (pIdx > 0) {
    const cand = resto.slice(pIdx);
    if (INSTRUMENTOS_KW.some(([re]) => re.test(cand)) || PERFORMER_HINT.test(cand)) {
      return { resto: resto.slice(0, pIdx).trim(), inline: cand };
    }
  }
  return { resto, inline: null };
}

export function parseTexto(texto: string, arquivo: string): CerimoniaExtraida {
  const linhas = texto
    .split("\n")
    .map((l) => l.replace(/ /g, " ").replace(/\s+$/g, ""));

  const avisos: string[] = [];
  const partes: ParteExtraida[] = [];
  const musicas: MusicaExtraida[] = [];
  const pool: MusicaExtraida[] = [];

  const naoVazias = linhas.filter((l) => l.trim());
  const titulo = naoVazias[0]?.trim() ?? arquivo;
  const idxTitulo = linhas.indexOf(naoVazias[0] ?? "");
  const data = parseData(linhas);

  let parteIndex: number | null = null;
  let poolMode = false;
  let atual: MusicaExtraida | null = null;
  const rawAtual: string[] = [];

  const RE_PARTE = /^\s*(\d+)\s*ª?\s*parte\b/i;
  const RE_DESPACHO = /^\s*\d*\s*[ºo]?\s*despacho\b/i;
  const RE_POOL = /^\s*(—\s*)?(despachos|extras\s*[-–]?\s*despacho)\s*$/i;
  const RE_NUM = /^\s*(\d+)\s*[.)\-–]\s*(.*)$/;

  function novaMusica(
    numero: number | null,
    resto: string,
    inline: string | null,
    isPool: boolean
  ): MusicaExtraida {
    const info = limparNome(resto);
    const m: MusicaExtraida = {
      numero,
      nome: info.nome,
      interpretes: [],
      instrumentos: [],
      tom: info.tom,
      capotraste: info.capotraste,
      isPercussao: info.isPercussao,
      marcadores: info.marcadores,
      isDespachoPool: isPool,
      parteIndex: isPool ? null : parteIndex,
      cifraBruta: null,
    };
    if (inline) {
      const pi = parseInterpretes(inline);
      m.interpretes = pi.interpretes;
      m.instrumentos = pi.instrumentos;
    }
    return m;
  }

  function fecharAtual() {
    if (atual) {
      atual.cifraBruta = rawAtual.join("\n").trim() || null;
      (atual.isDespachoPool ? pool : musicas).push(atual);
    }
    atual = null;
    rawAtual.length = 0;
  }

  for (let i = 0; i < linhas.length; i++) {
    if (i === idxTitulo) continue;
    const linha = linhas[i];
    const t = linha.trim();
    if (!t) {
      rawAtual.push("");
      continue;
    }

    if (RE_POOL.test(t)) {
      fecharAtual();
      poolMode = true;
      continue;
    }

    // PARTE de cerimônia (mas não "1ª PARTE: DM-AM", que é seção de uma música)
    if (!poolMode && RE_PARTE.test(t) && !/parte\s*:/i.test(t)) {
      fecharAtual();
      partes.push({ titulo: t, temasHint: parseTemasDoTitulo(t), despacho: null });
      parteIndex = partes.length - 1;
      continue;
    }

    if (!poolMode && RE_DESPACHO.test(t)) {
      fecharAtual();
      if (parteIndex !== null && partes[parteIndex]) partes[parteIndex].despacho = t;
      continue;
    }

    const mNum = t.match(RE_NUM);
    if (mNum) {
      fecharAtual();
      let resto = mNum[2].trim();
      if (!resto) {
        for (let j = i + 1; j < linhas.length; j++) {
          const tj = linhas[j].trim();
          if (!tj) continue;
          // Não engolir a próxima linha se ela já é outra entrada estruturada
          // (novo número, parte, despacho ou pool) — o item atual fica sem nome.
          if (RE_NUM.test(tj) || RE_PARTE.test(tj) || RE_DESPACHO.test(tj) || RE_POOL.test(tj)) break;
          resto = tj;
          i = j;
          break;
        }
      }
      const { resto: nomeResto, inline } = extrairInlineParen(resto);
      atual = novaMusica(Number(mNum[1]), nomeResto, inline, poolMode);
      continue;
    }

    // Linha entre parênteses logo após um título → intérpretes/instrumentos
    if (
      atual &&
      /^\s*\(/.test(t) &&
      !atual.interpretes.length &&
      !atual.instrumentos.length
    ) {
      if (ehLinhaAcordes(t)) {
        // Progressão de acordes — não são intérpretes. Se for um acorde só, vira tom.
        const inner = t.replace(/^\s*\(/, "").replace(/\)\s*$/, "").trim();
        if (!atual.tom && CHORD.test(inner)) {
          atual.tom = inner.charAt(0).toUpperCase() + inner.slice(1);
        }
        rawAtual.push(linha);
        continue;
      }
      const { interpretes, instrumentos } = parseInterpretes(t);
      atual.interpretes = interpretes;
      atual.instrumentos = instrumentos;
      rawAtual.push(linha);
      continue;
    }

    // Modo pool sem número: nome-like em caixa alta inicia música solta
    if (poolMode) {
      const nomeLike =
        !ehLinhaAcordes(t) &&
        /[A-ZÁÉÍÓÚÂÊÔÃÕ]{3,}/.test(t) &&
        /^[A-ZÁÉÍÓÚ0-9"']/.test(t) &&
        t.split(/\s+/).length <= 6;
      const prev = rawAtual.length ? rawAtual[rawAtual.length - 1] : "";
      const prevOk = !prev.trim() || ehLinhaAcordes(prev) || !atual;
      if (nomeLike && prevOk) {
        fecharAtual();
        const { resto: nomeResto, inline } = extrairInlineParen(t);
        atual = novaMusica(null, nomeResto, inline, true);
        continue;
      }
    }

    rawAtual.push(linha);
  }
  fecharAtual();

  const temasHint = [...new Set(partes.flatMap((p) => p.temasHint))];

  if (!musicas.length) avisos.push("Nenhuma música numerada detectada.");
  const semTom = musicas.filter((m) => !m.tom).length;
  if (semTom) avisos.push(`${semTom} de ${musicas.length} músicas sem tom — preencher na revisão.`);
  if (!temasHint.length)
    avisos.push("Nenhum tema explícito no arquivo — inferir manualmente.");
  if (pool.length)
    avisos.push(`${pool.length} item(ns) no pool de despacho — conferir (parser é impreciso aqui).`);

  return { arquivo, titulo, data, partes, musicas, poolDespacho: pool, temasHint, avisos };
}

export async function parseDocx(
  buf: Buffer | ArrayBuffer | Uint8Array,
  arquivo: string
): Promise<CerimoniaExtraida> {
  const texto = await extrairTexto(buf);
  return parseTexto(texto, arquivo);
}
