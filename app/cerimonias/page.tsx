import Link from "next/link";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CerimoniaRow {
  id: number;
  nome: string | null;
  data: string | null;
  local: string | null;
  temas: string | null;
}

export default async function CerimoniasPage() {
  const cerimonias = await all<CerimoniaRow>(`
    SELECT c.id, c.nome, c.data, c.local,
           (SELECT GROUP_CONCAT(t.nome, ' · ')
              FROM cerimonia_temas ct JOIN temas t ON t.id = ct.tema_id
             WHERE ct.cerimonia_id = c.id) AS temas
    FROM cerimonias c
    ORDER BY c.data DESC
  `);

  return (
    <>
      <div className="page-head">
        <h1>
          Cerimônias <span className="count">· {cerimonias.length}</span>
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/import" className="btn">
            Importar .docx
          </Link>
          <Link href="/cerimonias/montar" className="btn btn-primary">
            + Montar cerimônia
          </Link>
        </div>
      </div>

      {cerimonias.length === 0 ? (
        <div className="empty">
          <div className="big">Nenhuma cerimônia cadastrada ainda</div>
          <p style={{ margin: 0 }}>
            A montagem guiada de cerimônias — a partir do acervo, com sugestões por
            tema, tom e cantor — é a feature principal, planejada para a Fase 3.
          </p>
        </div>
      ) : (
        <div className="card">
          <ul className="rows">
            {cerimonias.map((c) => (
              <li key={c.id}>
                <Link href={`/cerimonias/${c.id}`} style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <span className="who">{c.nome ?? "Cerimônia"}</span>
                </Link>
                <span className="what">
                  {[c.data, c.temas, c.local].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
