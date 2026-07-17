import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

async function count(tabela: string): Promise<number> {
  const rows = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`);
  return rows[0]?.n ?? 0;
}

export default async function Home() {
  const [nTemas, nIntegrantes, nMusicas, nCerimonias] = await Promise.all([
    count("temas"),
    count("integrantes"),
    count("musicas"),
    count("cerimonias"),
  ]);

  const temas = await all<{ nome: string }>("SELECT nome FROM temas ORDER BY id");

  const stats = [
    { n: nMusicas, l: "Músicas" },
    { n: nTemas, l: "Temas" },
    { n: nCerimonias, l: "Cerimônias" },
    { n: nIntegrantes, l: "Integrantes" },
  ];

  return (
    <>
      <div className="page-head">
        <h1>Visão geral</h1>
      </div>
      <p className="sub">
        O acervo começa aqui. Cadastre músicas e integrantes, depois monte cerimônias
        a partir do repertório.
      </p>

      <div className="grid">
        {stats.map((s) => (
          <div className="stat" key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Temas ({temas.length})</h2>
        <div className="chips">
          {temas.map((t) => (
            <span className="chip" key={t.nome}>
              {t.nome}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
