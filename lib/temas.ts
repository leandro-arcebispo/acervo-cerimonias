import { all, get, run, nowIso } from "./db";
import type { Tema } from "./types";

export interface TemaComContagem extends Tema {
  n_musicas: number;
}

export async function listTemas(): Promise<TemaComContagem[]> {
  return all<TemaComContagem>(
    `SELECT t.*,
            (SELECT COUNT(*) FROM musica_temas mt WHERE mt.tema_id = t.id) AS n_musicas
       FROM temas t
      ORDER BY t.nome COLLATE NOCASE`
  );
}

export async function getTema(id: number): Promise<Tema | undefined> {
  return get<Tema>("SELECT * FROM temas WHERE id = ?", [id]);
}

export async function createTema(input: {
  nome: string;
  descricao?: string | null;
}): Promise<Tema> {
  const { lastId } = await run(
    "INSERT INTO temas (nome, descricao, created_at) VALUES (@nome, @descricao, @created_at)",
    { nome: input.nome, descricao: input.descricao ?? null, created_at: nowIso() }
  );
  return (await getTema(lastId))!;
}

export async function updateTema(
  id: number,
  patch: Partial<{ nome: string; descricao: string | null }>
): Promise<Tema | undefined> {
  const set: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const f of ["nome", "descricao"] as const) {
    if (patch[f] !== undefined) {
      set.push(`${f} = @${f}`);
      values[f] = patch[f];
    }
  }
  if (set.length) {
    await run(`UPDATE temas SET ${set.join(", ")} WHERE id = @id`, values as never);
  }
  return getTema(id);
}

export async function removeTema(id: number): Promise<void> {
  await run("DELETE FROM musica_temas WHERE tema_id = ?", [id]);
  await run("DELETE FROM cerimonia_temas WHERE tema_id = ?", [id]);
  await run("DELETE FROM momento_temas WHERE tema_id = ?", [id]);
  await run("DELETE FROM temas WHERE id = ?", [id]);
}
