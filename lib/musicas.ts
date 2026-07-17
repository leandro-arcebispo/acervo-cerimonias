import { all, get, run, nowIso } from "./db";
import { normalizar } from "./text";
import type { Musica, MusicaStatus } from "./types";

export interface MusicaListItem {
  id: number;
  nome: string;
  autor_compositor: string | null;
  is_percussao: number;
  is_coro: number;
  is_violao: number;
  is_acapella: number;
  status: MusicaStatus;
  cantor: string | null;
  temas: string | null;
}

export interface MusicaFull extends Musica {
  temas: number[];
}

export interface MusicaInput {
  nome: string;
  autor_compositor?: string | null;
  is_percussao?: number;
  is_coro?: number;
  is_violao?: number;
  is_acapella?: number;
  status?: MusicaStatus;
  letra?: string | null;
  cantor_habitual_id?: number | null;
  tom_padrao?: string | null;
  observacoes?: string | null;
  temas?: number[];
}

const BASE_LIST = `
  SELECT m.id, m.nome, m.autor_compositor, m.is_percussao,
         m.is_coro, m.is_violao, m.is_acapella, m.status,
         c.nome AS cantor,
         (SELECT GROUP_CONCAT(t.nome, ' · ')
            FROM musica_temas mt JOIN temas t ON t.id = mt.tema_id
           WHERE mt.musica_id = m.id) AS temas
    FROM musicas m
    LEFT JOIN integrantes c ON c.id = m.cantor_habitual_id
`;

export async function listMusicas(q?: string): Promise<MusicaListItem[]> {
  const termo = (q ?? "").trim();
  if (!termo) {
    return all<MusicaListItem>(BASE_LIST + " ORDER BY m.nome COLLATE NOCASE");
  }
  return all<MusicaListItem>(
    BASE_LIST +
      " WHERE m.nome_normalizado LIKE @qn OR m.letra LIKE @ql COLLATE NOCASE" +
      " ORDER BY m.nome COLLATE NOCASE",
    { qn: `%${normalizar(termo)}%`, ql: `%${termo}%` }
  );
}

export async function getMusica(id: number): Promise<MusicaFull | undefined> {
  const m = await get<Musica>("SELECT * FROM musicas WHERE id = ?", [id]);
  if (!m) return undefined;
  const temas = await all<{ tema_id: number }>(
    "SELECT tema_id FROM musica_temas WHERE musica_id = ?",
    [id]
  );
  return { ...m, temas: temas.map((t) => t.tema_id) };
}

async function setTemas(musicaId: number, ids: number[]): Promise<void> {
  await run("DELETE FROM musica_temas WHERE musica_id = ?", [musicaId]);
  for (const t of ids) {
    await run(
      "INSERT OR IGNORE INTO musica_temas (musica_id, tema_id) VALUES (?, ?)",
      [musicaId, t]
    );
  }
}

export async function createMusica(input: MusicaInput): Promise<MusicaFull> {
  const now = nowIso();
  const { lastId } = await run(
    `INSERT INTO musicas
       (nome, nome_normalizado, autor_compositor, is_percussao, is_coro, is_violao,
        is_acapella, status, letra, cantor_habitual_id, tom_padrao, observacoes,
        created_at, updated_at)
     VALUES
       (@nome, @nome_normalizado, @autor, @perc, @coro, @violao,
        @acapella, @status, @letra, @cantor, @tom, @obs, @ca, @ua)`,
    {
      nome: input.nome,
      nome_normalizado: normalizar(input.nome),
      autor: input.autor_compositor ?? null,
      perc: input.is_percussao ?? 0,
      coro: input.is_coro ?? 0,
      violao: input.is_violao ?? 0,
      acapella: input.is_acapella ?? 0,
      status: input.status ?? "consolidada",
      letra: input.letra ?? null,
      cantor: input.cantor_habitual_id ?? null,
      tom: input.tom_padrao ?? null,
      obs: input.observacoes ?? null,
      ca: now,
      ua: now,
    }
  );
  await setTemas(lastId, input.temas ?? []);
  return (await getMusica(lastId))!;
}

const COLS: Record<string, string> = {
  nome: "nome",
  autor_compositor: "autor_compositor",
  is_percussao: "is_percussao",
  is_coro: "is_coro",
  is_violao: "is_violao",
  is_acapella: "is_acapella",
  status: "status",
  letra: "letra",
  cantor_habitual_id: "cantor_habitual_id",
  tom_padrao: "tom_padrao",
  observacoes: "observacoes",
};

export async function updateMusica(
  id: number,
  patch: Partial<MusicaInput>
): Promise<MusicaFull | undefined> {
  const set: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const key of Object.keys(COLS)) {
    const v = (patch as Record<string, unknown>)[key];
    if (v !== undefined) {
      set.push(`${COLS[key]} = @${key}`);
      values[key] = v;
    }
  }
  if (patch.nome !== undefined) {
    set.push("nome_normalizado = @nome_normalizado");
    values.nome_normalizado = normalizar(patch.nome);
  }
  set.push("updated_at = @updated_at");
  values.updated_at = nowIso();
  await run(`UPDATE musicas SET ${set.join(", ")} WHERE id = @id`, values as never);
  if (patch.temas !== undefined) await setTemas(id, patch.temas);
  return getMusica(id);
}

export async function removeMusica(id: number): Promise<void> {
  await run("DELETE FROM musica_temas WHERE musica_id = ?", [id]);
  await run("DELETE FROM musica_tons WHERE musica_id = ?", [id]);
  await run("DELETE FROM maestria_voz WHERE musica_id = ?", [id]);
  await run("DELETE FROM musica_versoes WHERE musica_id = ?", [id]);
  await run("DELETE FROM pool_despacho WHERE musica_id = ?", [id]);
  await run("UPDATE itens_cerimonia SET musica_id = NULL WHERE musica_id = ?", [id]);
  await run("DELETE FROM musicas WHERE id = ?", [id]);
}
