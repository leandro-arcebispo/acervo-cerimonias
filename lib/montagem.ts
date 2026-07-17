import { all } from "./db";

export interface MusicaSugestao {
  id: number;
  nome: string;
  isPercussao: number;
  temas: string[];
  vezesTocada: number;
  ultimaData: string | null;
  tomMaisUsado: string | null;
  cantorHabitualId: number | null;
  cantorHabitualNome: string | null;
}

/**
 * Músicas candidatas para montar uma cerimônia, com estatísticas de uso
 * (frequência, última vez, tom mais tocado, cantor habitual). Filtra pelos temas
 * selecionados; sem temas, retorna o acervo inteiro (para a busca livre).
 */
export async function sugestoesMusicas(
  temaIds: number[]
): Promise<MusicaSugestao[]> {
  type MusicaBase = {
    id: number;
    nome: string;
    is_percussao: number;
    cantor_habitual_id: number | null;
    tom_padrao: string | null;
  };
  const musicas = temaIds.length
    ? await all<MusicaBase>(
        `SELECT DISTINCT m.id, m.nome, m.is_percussao, m.cantor_habitual_id, m.tom_padrao
           FROM musicas m
           JOIN musica_temas mt ON mt.musica_id = m.id
          WHERE mt.tema_id IN (${temaIds.map(() => "?").join(",")})
          ORDER BY m.nome COLLATE NOCASE`,
        temaIds
      )
    : await all<MusicaBase>(
        "SELECT id, nome, is_percussao, cantor_habitual_id, tom_padrao FROM musicas ORDER BY nome COLLATE NOCASE"
      );

  const [usos, temaLinks, integ] = await Promise.all([
    all<{ musica_id: number; tom: string | null; cantor_id: number | null; data: string | null }>(
      `SELECT ic.musica_id, ic.tom, ic.cantor_id, c.data
         FROM itens_cerimonia ic
         JOIN cerimonias c ON c.id = ic.cerimonia_id
        WHERE ic.tipo = 'musica' AND ic.musica_id IS NOT NULL`
    ),
    all<{ musica_id: number; nome: string }>(
      "SELECT mt.musica_id, t.nome FROM musica_temas mt JOIN temas t ON t.id = mt.tema_id"
    ),
    all<{ id: number; nome: string }>("SELECT id, nome FROM integrantes"),
  ]);

  const integMap = new Map(integ.map((i) => [i.id, i.nome]));

  const temasPorMusica = new Map<number, string[]>();
  for (const tl of temaLinks) {
    const a = temasPorMusica.get(tl.musica_id) ?? [];
    a.push(tl.nome);
    temasPorMusica.set(tl.musica_id, a);
  }

  const usosPorMusica = new Map<number, typeof usos>();
  for (const u of usos) {
    const a = usosPorMusica.get(u.musica_id) ?? [];
    a.push(u);
    usosPorMusica.set(u.musica_id, a);
  }

  return musicas.map((m) => {
    const us = usosPorMusica.get(m.id) ?? [];
    const tomCount = new Map<string, number>();
    let ultimaData: string | null = null;
    for (const u of us) {
      if (u.tom) tomCount.set(u.tom, (tomCount.get(u.tom) ?? 0) + 1);
      if (u.data && (!ultimaData || u.data > ultimaData)) ultimaData = u.data;
    }
    let tomMaisUsado: string | null = null;
    let best = 0;
    for (const [tom, c] of tomCount) {
      if (c > best) {
        best = c;
        tomMaisUsado = tom;
      }
    }
    return {
      id: m.id,
      nome: m.nome,
      isPercussao: m.is_percussao,
      temas: temasPorMusica.get(m.id) ?? [],
      vezesTocada: us.length,
      ultimaData,
      tomMaisUsado: tomMaisUsado ?? m.tom_padrao ?? null,
      cantorHabitualId: m.cantor_habitual_id ?? null,
      cantorHabitualNome: m.cantor_habitual_id
        ? integMap.get(m.cantor_habitual_id) ?? null
        : null,
    };
  });
}
