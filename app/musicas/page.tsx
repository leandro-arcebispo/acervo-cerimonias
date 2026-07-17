import Link from "next/link";
import { listMusicas } from "@/lib/musicas";

export const dynamic = "force-dynamic";

export default async function MusicasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = (q ?? "").trim();
  const musicas = await listMusicas(termo || undefined);

  return (
    <>
      <div className="page-head">
        <h1>
          Músicas <span className="count">· {musicas.length}</span>
        </h1>
        <Link href="/musicas/nova" className="btn btn-primary">
          + Nova música
        </Link>
      </div>

      <form className="field" style={{ marginBottom: "1.5rem" }} action="/musicas">
        <span aria-hidden="true">&#9906;</span>
        <input
          name="q"
          defaultValue={termo}
          placeholder="Buscar por nome ou trecho da letra…"
        />
      </form>

      {musicas.length === 0 ? (
        <div className="empty">
          <div className="big">
            {termo ? "Nenhuma música encontrada" : "Nenhuma música no acervo ainda"}
          </div>
          <p style={{ margin: 0 }}>
            {termo
              ? `Nada corresponde a “${termo}”.`
              : "Cadastre a primeira música ou, na Fase 2, importe os arquivos de cerimônia (.docx)."}
          </p>
        </div>
      ) : (
        <div className="card">
          <ol className="songlist">
            {musicas.map((m, i) => (
              <li className="song-row" key={m.id}>
                <Link
                  href={`/musicas/${m.id}`}
                  style={{ display: "contents", color: "inherit" }}
                >
                  <span className="song-num">{i + 1}</span>
                  <div className="song-main">
                    <div className="song-name">{m.nome}</div>
                    <div className="song-meta">
                      {m.autor_compositor ||
                        (m.cantor ? `canta: ${m.cantor}` : "—")}
                    </div>
                  </div>
                  <span className="leader" />
                  {m.is_percussao ? <span className="tag">percussão</span> : null}
                  {m.is_coro ? <span className="tag">coro</span> : null}
                  {m.is_violao ? <span className="tag">violão</span> : null}
                  {m.is_acapella ? <span className="tag">acapella</span> : null}
                  {m.temas && <span className="tag">{m.temas}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
