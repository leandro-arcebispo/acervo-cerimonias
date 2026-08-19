import { all, get, run, nowIso } from "./db";

export interface ItemMontagem {
  tipo: "musica" | "despacho" | "quebra";
  musicaId?: number | null;
  tom?: string | null;
  cantorIds?: number[];
  capotraste?: number | null;
  marcador?: string | null;
}

export interface CriarCerimoniaInput {
  nome: string;
  data: string | null;
  local: string | null;
  temaIds: number[];
  integranteIds: number[];
  itens: ItemMontagem[];
  pool: { musicaId: number; tom?: string | null }[];
}

/** Grava temas/integrantes/itens/pool de uma cerimônia já criada (numeração automática). */
async function salvarConteudo(cid: number, inp: CriarCerimoniaInput): Promise<void> {
  for (const t of inp.temaIds) {
    await run(
      "INSERT OR IGNORE INTO cerimonia_temas (cerimonia_id, tema_id) VALUES (?, ?)",
      [cid, t]
    );
  }
  for (const i of inp.integranteIds) {
    await run(
      "INSERT OR IGNORE INTO cerimonia_integrantes (cerimonia_id, integrante_id) VALUES (?, ?)",
      [cid, i]
    );
  }
  let ordem = 0;
  let numero = 0;
  for (const it of inp.itens) {
    if (it.tipo === "quebra") {
      await run(
        "INSERT INTO itens_cerimonia (cerimonia_id, ordem, tipo) VALUES (?, ?, 'quebra')",
        [cid, ordem++]
      );
    } else if (it.tipo === "despacho") {
      await run(
        "INSERT INTO itens_cerimonia (cerimonia_id, ordem, tipo, marcador) VALUES (?, ?, 'despacho', ?)",
        [cid, ordem++, it.marcador ?? "Despacho"]
      );
    } else if (it.musicaId) {
      numero++;
      const cantorIds = [...new Set(it.cantorIds ?? [])];
      const { lastId: itemId } = await run(
        `INSERT INTO itens_cerimonia
           (cerimonia_id, ordem, tipo, musica_id, tom, capotraste, cantor_id, numero)
         VALUES (@c, @o, 'musica', @m, @t, @cap, @cant, @num)`,
        {
          c: cid,
          o: ordem++,
          m: it.musicaId,
          t: it.tom ?? null,
          cap: it.capotraste ?? null,
          cant: cantorIds[0] ?? null,
          num: numero,
        }
      );
      for (const cantorId of cantorIds) {
        await run(
          "INSERT OR IGNORE INTO item_cantores (item_id, integrante_id) VALUES (?, ?)",
          [itemId, cantorId]
        );
      }
    }
  }
  let po = 0;
  for (const p of inp.pool) {
    await run(
      "INSERT INTO pool_despacho (cerimonia_id, musica_id, tom, ordem_sugerida) VALUES (?, ?, ?, ?)",
      [cid, p.musicaId, p.tom ?? null, po++]
    );
  }
}

/** Cria uma cerimônia montada (numeração automática das músicas). */
export async function criarCerimonia(inp: CriarCerimoniaInput): Promise<number> {
  const { lastId: cid } = await run(
    "INSERT INTO cerimonias (nome, data, local, created_at) VALUES (@n, @d, @l, @c)",
    { n: inp.nome, d: inp.data, l: inp.local, c: nowIso() }
  );
  await salvarConteudo(cid, inp);
  return cid;
}

/**
 * Substitui o conteúdo de uma cerimônia existente (temas, integrantes, itens, pool)
 * pelo estado atual vindo da tela "Montar Cerimônia" em modo edição. Momentos/PARTES
 * (só existem em cerimônias vindas do import) são descartados — o builder é uma
 * lista plana.
 */
export async function atualizarCerimonia(
  id: number,
  inp: CriarCerimoniaInput
): Promise<void> {
  await run(
    "UPDATE cerimonias SET nome = @n, data = @d, local = @l WHERE id = @id",
    { n: inp.nome, d: inp.data, l: inp.local, id }
  );
  await run("DELETE FROM itens_cerimonia WHERE cerimonia_id = ?", [id]);
  await run(
    "DELETE FROM momento_temas WHERE momento_id IN (SELECT id FROM momentos WHERE cerimonia_id = ?)",
    [id]
  );
  await run("DELETE FROM momentos WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM cerimonia_temas WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM cerimonia_integrantes WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM pool_despacho WHERE cerimonia_id = ?", [id]);
  await salvarConteudo(id, inp);
}

export interface CerimoniaHeader {
  id: number;
  nome: string | null;
  data: string | null;
  localNome: string | null;
  observacoes: string | null;
}

export interface MomentoCompleto {
  id: number;
  ordem: number;
  titulo: string | null;
  temas: string[];
}

export interface ItemCompleto {
  id: number;
  momentoId: number | null;
  ordem: number;
  tipo: "musica" | "despacho" | "quebra";
  numero: number | null;
  musicaId: number | null;
  musicaNome: string | null;
  isPercussao: number;
  isCoro: number;
  isViolao: number;
  isAcapella: number;
  tom: string | null;
  capotraste: number | null;
  cantorNomes: string[];
  marcador: string | null;
  letra: string | null;
  chordpro: string | null;
  tomPadrao: string | null;
}

export interface IntegranteCerimonia {
  nome: string;
  instrumento: string | null;
}

export interface PoolItem {
  musicaId: number;
  musicaNome: string;
  tom: string | null;
  letra: string | null;
  chordpro: string | null;
  tomPadrao: string | null;
}

export interface CerimoniaCompleta {
  cerimonia: CerimoniaHeader;
  temas: string[];
  integrantes: IntegranteCerimonia[];
  momentos: MomentoCompleto[];
  itens: ItemCompleto[];
  pool: PoolItem[];
}

/** Carrega uma cerimônia salva com tudo que a folha impressa precisa. */
export async function getCerimoniaCompleta(
  id: number
): Promise<CerimoniaCompleta | null> {
  const cerimonia = await get<CerimoniaHeader>(
    `SELECT c.id, c.nome, c.data, c.observacoes, c.local AS localNome
       FROM cerimonias c
      WHERE c.id = ?`,
    [id]
  );
  if (!cerimonia) return null;

  const [temasRows, integrantesRows, momentosRows, itensRows, poolRows] =
    await Promise.all([
      all<{ nome: string }>(
        `SELECT t.nome FROM cerimonia_temas ct
           JOIN temas t ON t.id = ct.tema_id
          WHERE ct.cerimonia_id = ? ORDER BY t.nome`,
        [id]
      ),
      all<IntegranteCerimonia>(
        `SELECT i.nome, ins.nome AS instrumento
           FROM cerimonia_integrantes ci
           JOIN integrantes i ON i.id = ci.integrante_id
           LEFT JOIN instrumentos ins ON ins.id = ci.instrumento_id
          WHERE ci.cerimonia_id = ? ORDER BY i.nome`,
        [id]
      ),
      all<{ id: number; ordem: number; titulo: string | null }>(
        `SELECT id, ordem, titulo FROM momentos WHERE cerimonia_id = ? ORDER BY ordem`,
        [id]
      ),
      all<Omit<ItemCompleto, "cantorNomes"> & { cantorNomeLegado: string | null }>(
        `SELECT i.id, i.momento_id AS momentoId, i.ordem, i.tipo, i.numero,
                i.musica_id AS musicaId, m.nome AS musicaNome, m.is_percussao AS isPercussao,
                m.is_coro AS isCoro, m.is_violao AS isViolao, m.is_acapella AS isAcapella,
                i.tom, i.capotraste, ig.nome AS cantorNomeLegado, i.marcador, m.letra,
                m.chordpro, m.tom_padrao AS tomPadrao
           FROM itens_cerimonia i
           LEFT JOIN musicas m ON m.id = i.musica_id
           LEFT JOIN integrantes ig ON ig.id = i.cantor_id
          WHERE i.cerimonia_id = ?
          ORDER BY i.ordem`,
        [id]
      ),
      all<PoolItem>(
        `SELECT p.musica_id AS musicaId, m.nome AS musicaNome, p.tom, m.letra,
                m.chordpro, m.tom_padrao AS tomPadrao
           FROM pool_despacho p
           JOIN musicas m ON m.id = p.musica_id
          WHERE p.cerimonia_id = ?
          ORDER BY p.ordem_sugerida`,
        [id]
      ),
    ]);

  const momentoTemas = await all<{ momento_id: number; nome: string }>(
    `SELECT mt.momento_id, t.nome
       FROM momento_temas mt
       JOIN temas t ON t.id = mt.tema_id
      WHERE mt.momento_id IN (SELECT id FROM momentos WHERE cerimonia_id = ?)`,
    [id]
  );
  const temasPorMomento = new Map<number, string[]>();
  for (const r of momentoTemas) {
    const arr = temasPorMomento.get(r.momento_id) ?? [];
    arr.push(r.nome);
    temasPorMomento.set(r.momento_id, arr);
  }

  const cantoresPorItem = new Map<number, string[]>();
  if (itensRows.length) {
    const cantoresRows = await all<{ item_id: number; nome: string }>(
      `SELECT ic.item_id, i.nome
         FROM item_cantores ic
         JOIN integrantes i ON i.id = ic.integrante_id
        WHERE ic.item_id IN (SELECT id FROM itens_cerimonia WHERE cerimonia_id = ?)
        ORDER BY i.nome`,
      [id]
    );
    for (const r of cantoresRows) {
      const arr = cantoresPorItem.get(r.item_id) ?? [];
      arr.push(r.nome);
      cantoresPorItem.set(r.item_id, arr);
    }
  }

  return {
    cerimonia,
    temas: temasRows.map((t) => t.nome),
    integrantes: integrantesRows,
    momentos: momentosRows.map((m) => ({
      ...m,
      temas: temasPorMomento.get(m.id) ?? [],
    })),
    itens: itensRows.map(({ cantorNomeLegado, ...item }) => ({
      ...item,
      cantorNomes:
        cantoresPorItem.get(item.id) ?? (cantorNomeLegado ? [cantorNomeLegado] : []),
    })),
    pool: poolRows,
  };
}

export interface ItemParaEditar {
  tipo: "musica" | "despacho" | "quebra";
  musicaId?: number;
  nome?: string;
  tom: string;
  cantorIds: number[];
}

export interface PoolParaEditar {
  musicaId: number;
  nome: string;
  tom: string;
}

export interface CerimoniaParaEditar {
  id: number;
  nome: string;
  data: string;
  local: string;
  temaIds: number[];
  integranteIds: number[];
  itens: ItemParaEditar[];
  pool: PoolParaEditar[];
}

/** Carrega uma cerimônia no formato que a tela "Montar Cerimônia" usa (edição). */
export async function getCerimoniaParaEditar(
  id: number
): Promise<CerimoniaParaEditar | null> {
  const cerimonia = await get<{
    id: number;
    nome: string | null;
    data: string | null;
    local: string | null;
  }>("SELECT id, nome, data, local FROM cerimonias WHERE id = ?", [id]);
  if (!cerimonia) return null;

  const [temaRows, integranteRows, itensRows, poolRows] = await Promise.all([
    all<{ tema_id: number }>(
      "SELECT tema_id FROM cerimonia_temas WHERE cerimonia_id = ?",
      [id]
    ),
    all<{ integrante_id: number }>(
      "SELECT integrante_id FROM cerimonia_integrantes WHERE cerimonia_id = ?",
      [id]
    ),
    all<{
      id: number;
      tipo: "musica" | "despacho" | "quebra";
      musica_id: number | null;
      nome: string | null;
      tom: string | null;
      cantor_id: number | null;
    }>(
      `SELECT i.id, i.tipo, i.musica_id, m.nome, i.tom, i.cantor_id
         FROM itens_cerimonia i
         LEFT JOIN musicas m ON m.id = i.musica_id
        WHERE i.cerimonia_id = ?
        ORDER BY i.ordem`,
      [id]
    ),
    all<{ musica_id: number; nome: string; tom: string | null }>(
      `SELECT p.musica_id, m.nome, p.tom
         FROM pool_despacho p
         JOIN musicas m ON m.id = p.musica_id
        WHERE p.cerimonia_id = ?
        ORDER BY p.ordem_sugerida`,
      [id]
    ),
  ]);

  const cantoresPorItem = new Map<number, number[]>();
  if (itensRows.length) {
    const cantoresRows = await all<{ item_id: number; integrante_id: number }>(
      `SELECT item_id, integrante_id FROM item_cantores
        WHERE item_id IN (SELECT id FROM itens_cerimonia WHERE cerimonia_id = ?)`,
      [id]
    );
    for (const r of cantoresRows) {
      const arr = cantoresPorItem.get(r.item_id) ?? [];
      arr.push(r.integrante_id);
      cantoresPorItem.set(r.item_id, arr);
    }
  }

  return {
    id: cerimonia.id,
    nome: cerimonia.nome ?? "",
    data: cerimonia.data ?? "",
    local: cerimonia.local ?? "",
    temaIds: temaRows.map((t) => t.tema_id),
    integranteIds: integranteRows.map((i) => i.integrante_id),
    itens: itensRows.map((r) =>
      r.tipo === "despacho" || r.tipo === "quebra"
        ? { tipo: r.tipo, tom: "", cantorIds: [] }
        : {
            tipo: "musica" as const,
            musicaId: r.musica_id ?? undefined,
            nome: r.nome ?? "",
            tom: r.tom ?? "",
            cantorIds:
              cantoresPorItem.get(r.id) ?? (r.cantor_id != null ? [r.cantor_id] : []),
          }
    ),
    pool: poolRows.map((p) => ({
      musicaId: p.musica_id,
      nome: p.nome,
      tom: p.tom ?? "",
    })),
  };
}

export async function removeCerimonia(id: number): Promise<void> {
  await run("DELETE FROM itens_cerimonia WHERE cerimonia_id = ?", [id]);
  await run(
    "DELETE FROM momento_temas WHERE momento_id IN (SELECT id FROM momentos WHERE cerimonia_id = ?)",
    [id]
  );
  await run("DELETE FROM momentos WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM cerimonia_temas WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM cerimonia_integrantes WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM pool_despacho WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM audios WHERE cerimonia_id = ?", [id]);
  await run("DELETE FROM cerimonias WHERE id = ?", [id]);
}
