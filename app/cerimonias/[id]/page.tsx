import { notFound } from "next/navigation";
import { getCerimoniaCompleta } from "@/lib/cerimonias";
import FolhaToolbar from "@/components/FolhaToolbar";

export const dynamic = "force-dynamic";

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default async function CerimoniaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCerimoniaCompleta(Number(id));
  if (!c) notFound();

  const { cerimonia, temas, integrantes, momentos, itens, pool } = c;
  const temasPorMomento = new Map(momentos.map((m) => [m.id, m.temas]));

  const indice = itens
    .filter((item) => item.tipo === "musica" && item.musicaNome)
    .map((item) => ({ nome: item.musicaNome as string, numero: item.numero }))
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));

  let momentoAtual: number | null | undefined = undefined;

  return (
    <FolhaToolbar cerimoniaId={cerimonia.id}>
      <div className="folha-header">
        <div className="folha-titulo">{cerimonia.nome ?? "Cerimônia"}</div>
        <div className="folha-sub">
          {[formatarData(cerimonia.data), cerimonia.localNome]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {temas.length > 0 && <div className="folha-temas">{temas.join(" · ")}</div>}
        {integrantes.length > 0 && (
          <div className="folha-integrantes">
            {integrantes
              .map((i) => (i.instrumento ? `${i.nome} (${i.instrumento})` : i.nome))
              .join(" · ")}
          </div>
        )}
      </div>

      {indice.length > 0 && (
        <div className="folha-indice">
          <h2>Índice</h2>
          <ol className="folha-indice-lista">
            {indice.map((it, i) => (
              <li key={i} className="folha-indice-item">
                <span className="nome">{it.nome}</span>
                <span className="leader" />
                <span className="num">{it.numero}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {indice.length > 0 && <div className="folha-quebra-indice" aria-hidden="true" />}

      <ol className="folha-lista">
        {itens.map((item) => {
          const trocouMomento = item.momentoId !== momentoAtual;
          momentoAtual = item.momentoId;
          const momento =
            item.momentoId != null
              ? momentos.find((m) => m.id === item.momentoId)
              : null;

          return (
            <li key={item.id} className="folha-item-wrap">
              {trocouMomento && momento && (
                <div className="folha-momento">
                  {momento.titulo}
                  {(temasPorMomento.get(momento.id)?.length ?? 0) > 0 && (
                    <span className="folha-momento-temas">
                      {" "}
                      — {temasPorMomento.get(momento.id)!.join(", ")}
                    </span>
                  )}
                </div>
              )}

              {item.tipo === "quebra" ? (
                <div className="folha-quebra-linha">Quebra de página</div>
              ) : item.tipo === "despacho" ? (
                <div className="despacho-item">{item.marcador || "Despacho"}</div>
              ) : (
                <div className="folha-musica-bloco">
                  <div className="folha-musica-topo">
                    <span className="song-num">{item.numero}</span>
                    <span className="song-name">
                      {item.musicaNome}
                      {item.isPercussao ? <span className="tag"> percussão</span> : null}
                      {item.isCoro ? <span className="tag"> coro</span> : null}
                      {item.isViolao ? <span className="tag"> violão</span> : null}
                      {item.isAcapella ? <span className="tag"> acapella</span> : null}
                    </span>
                  </div>
                  {(item.cantorNomes.length > 0 || item.capotraste || item.tom) && (
                    <div className="folha-musica-meta">
                      {item.cantorNomes.length > 0 && (
                        <span className="song-meta">{item.cantorNomes.join(", ")}</span>
                      )}
                      {item.capotraste ? (
                        <span className="song-meta">capo {item.capotraste}</span>
                      ) : null}
                      {item.tom && <span className="tom">{item.tom}</span>}
                    </div>
                  )}
                  {item.letra ? (
                    <pre className="folha-letra">{item.letra}</pre>
                  ) : (
                    <p className="folha-letra-vazia">sem letra cadastrada</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {pool.length > 0 && (
        <div className="folha-pool">
          <h2>Pool de despacho</h2>
          <ol className="folha-lista">
            {pool.map((p, i) => (
              <li key={i} className="folha-musica-bloco">
                <div className="folha-musica-topo">
                  <span className="song-name">{p.musicaNome}</span>
                </div>
                {p.tom && (
                  <div className="folha-musica-meta">
                    <span className="tom">{p.tom}</span>
                  </div>
                )}
                {p.letra ? (
                  <pre className="folha-letra">{p.letra}</pre>
                ) : (
                  <p className="folha-letra-vazia">sem letra cadastrada</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </FolhaToolbar>
  );
}
