import { all, get, run, nowIso } from "./db";
import type { Integrante, Instrumento } from "./types";

export interface IntegranteFull extends Integrante {
  instrumentos: number[];
  instrumentos_nomes: string;
}

export interface IntegranteInput {
  nome: string;
  ativo?: number;
  observacoes?: string | null;
  instrumentos?: number[];
}

export async function listInstrumentos(): Promise<Instrumento[]> {
  return all<Instrumento>("SELECT * FROM instrumentos ORDER BY ordem, nome");
}

export async function listIntegrantes(): Promise<IntegranteFull[]> {
  const integrantes = await all<Integrante>(
    "SELECT * FROM integrantes ORDER BY ativo DESC, nome COLLATE NOCASE"
  );
  const links = await all<{
    integrante_id: number;
    instrumento_id: number;
    nome: string;
  }>(
    `SELECT ii.integrante_id, ii.instrumento_id, ins.nome
       FROM integrante_instrumentos ii
       JOIN instrumentos ins ON ins.id = ii.instrumento_id
      ORDER BY ins.ordem`
  );
  return integrantes.map((i) => {
    const mine = links.filter((l) => l.integrante_id === i.id);
    return {
      ...i,
      instrumentos: mine.map((m) => m.instrumento_id),
      instrumentos_nomes: mine.map((m) => m.nome).join(", "),
    };
  });
}

export async function getIntegrante(id: number): Promise<IntegranteFull | undefined> {
  const i = await get<Integrante>("SELECT * FROM integrantes WHERE id = ?", [id]);
  if (!i) return undefined;
  const links = await all<{ instrumento_id: number; nome: string }>(
    `SELECT ii.instrumento_id, ins.nome
       FROM integrante_instrumentos ii
       JOIN instrumentos ins ON ins.id = ii.instrumento_id
      WHERE ii.integrante_id = ?
      ORDER BY ins.ordem`,
    [id]
  );
  return {
    ...i,
    instrumentos: links.map((l) => l.instrumento_id),
    instrumentos_nomes: links.map((l) => l.nome).join(", "),
  };
}

async function setInstrumentos(integranteId: number, ids: number[]): Promise<void> {
  await run("DELETE FROM integrante_instrumentos WHERE integrante_id = ?", [
    integranteId,
  ]);
  for (const instId of ids) {
    await run(
      "INSERT OR IGNORE INTO integrante_instrumentos (integrante_id, instrumento_id) VALUES (?, ?)",
      [integranteId, instId]
    );
  }
}

export async function createIntegrante(
  input: IntegranteInput
): Promise<IntegranteFull> {
  const { lastId } = await run(
    "INSERT INTO integrantes (nome, ativo, observacoes, created_at) VALUES (@nome, @ativo, @observacoes, @created_at)",
    {
      nome: input.nome,
      ativo: input.ativo ?? 1,
      observacoes: input.observacoes ?? null,
      created_at: nowIso(),
    }
  );
  await setInstrumentos(lastId, input.instrumentos ?? []);
  return (await getIntegrante(lastId))!;
}

export async function updateIntegrante(
  id: number,
  patch: Partial<IntegranteInput>
): Promise<IntegranteFull | undefined> {
  const set: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const f of ["nome", "ativo", "observacoes"] as const) {
    if (patch[f] !== undefined) {
      set.push(`${f} = @${f}`);
      values[f] = patch[f];
    }
  }
  if (set.length) {
    await run(
      `UPDATE integrantes SET ${set.join(", ")} WHERE id = @id`,
      values as never
    );
  }
  if (patch.instrumentos !== undefined) {
    await setInstrumentos(id, patch.instrumentos);
  }
  return getIntegrante(id);
}

export async function removeIntegrante(id: number): Promise<void> {
  await run("DELETE FROM integrante_instrumentos WHERE integrante_id = ?", [id]);
  await run("DELETE FROM integrantes WHERE id = ?", [id]);
}
