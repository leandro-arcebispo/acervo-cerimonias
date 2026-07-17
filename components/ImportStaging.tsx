"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Opt {
  id: number;
  nome: string;
}

interface PreviewMusica {
  nome: string;
  nomeNormalizado: string;
  existenteId: number | null;
  interpretes: string[];
  cantorId: number | null;
  instrumentos: string[];
  tom: string | null;
  capotraste: number | null;
  isPercussao: boolean;
  marcadores: string[];
  temaIds: number[];
  isDespachoPool: boolean;
  numero: number | null;
  parteIndex: number | null;
  cifraBruta: string | null;
}

interface Preview {
  arquivo: string;
  titulo: string;
  data: string | null;
  local: string | null;
  temaIds: number[];
  partes: { titulo: string; temaIds: number[]; despacho: string | null }[];
  musicas: PreviewMusica[];
  poolDespacho: PreviewMusica[];
  integranteIds: number[];
  avisos: string[];
}

export default function ImportStaging({
  preview,
  temas,
  integrantes,
}: {
  preview: Preview;
  temas: Opt[];
  integrantes: Opt[];
}) {
  const router = useRouter();
  const [p, setP] = useState<Preview>(preview);
  const [editTemas, setEditTemas] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    cerimoniaId: number;
    musicasCriadas: number;
    musicasReusadas: number;
  } | null>(null);
  // Itens sem nome (números soltos no arquivo) já entram desmarcados p/ exclusão.
  const [excluidos, setExcluidos] = useState<Set<number>>(
    () => new Set(preview.musicas.flatMap((m, i) => (m.nome.trim() ? [] : [i])))
  );
  const [excluidosPool, setExcluidosPool] = useState<Set<number>>(
    () => new Set(preview.poolDespacho.flatMap((m, i) => (m.nome.trim() ? [] : [i])))
  );

  function toggleExcluir(idx: number, pool = false) {
    const set = pool ? setExcluidosPool : setExcluidos;
    set((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const temaNome = useMemo(
    () => new Map(temas.map((t) => [t.id, t.nome])),
    [temas]
  );
  const integNome = useMemo(
    () => new Map(integrantes.map((i) => [i.id, i.nome])),
    [integrantes]
  );

  const musicasIncluidas = p.musicas.filter((_, i) => !excluidos.has(i));
  const poolIncluido = p.poolDespacho.filter((_, i) => !excluidosPool.has(i));
  const novas = musicasIncluidas.filter((m) => !m.existenteId).length;
  const existentes = musicasIncluidas.length - novas;

  function setTom(idx: number, tom: string, pool = false) {
    setP((prev) => {
      const arr = pool ? [...prev.poolDespacho] : [...prev.musicas];
      arr[idx] = { ...arr[idx], tom: tom || null };
      return pool ? { ...prev, poolDespacho: arr } : { ...prev, musicas: arr };
    });
  }

  function toggleTema(id: number) {
    setP((prev) => ({
      ...prev,
      temaIds: prev.temaIds.includes(id)
        ? prev.temaIds.filter((x) => x !== id)
        : [...prev.temaIds, id],
    }));
  }

  async function importar() {
    setBusy(true);
    setErro(null);
    // Músicas sem parte herdam os temas (possivelmente editados) da cerimônia.
    const payload: Preview = {
      ...p,
      musicas: musicasIncluidas.map((m) => {
        const pt =
          m.parteIndex != null ? p.partes[m.parteIndex]?.temaIds ?? [] : [];
        return { ...m, temaIds: pt.length ? pt : p.temaIds };
      }),
      poolDespacho: poolIncluido.map((m) => ({ ...m, temaIds: p.temaIds })),
    };
    const r = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao importar.");
      return;
    }
    setResultado(await r.json());
    router.refresh();
  }

  if (resultado) {
    return (
      <div className="card">
        <div className="big" style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>
          Cerimônia importada ✓
        </div>
        <p className="note">
          {resultado.musicasCriadas} música(s) nova(s) e {resultado.musicasReusadas}{" "}
          reaproveitada(s) do acervo.
        </p>
        <div className="form-actions">
          <a href="/cerimonias" className="btn btn-primary">
            Ver cerimônias
          </a>
          <a href="/musicas" className="btn">
            Ver músicas
          </a>
          <a href="/import" className="btn">
            Importar outra
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="form-row">
          <label className="lbl">Nome da cerimônia</label>
          <input
            className="input"
            value={p.titulo}
            onChange={(e) => setP({ ...p, titulo: e.target.value })}
          />
        </div>
        <div className="form-row" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <label className="lbl">Data</label>
            <input
              className="input"
              type="date"
              value={p.data ?? ""}
              onChange={(e) => setP({ ...p, data: e.target.value || null })}
            />
          </div>
        </div>
        <div className="form-row">
          <label className="lbl">
            Temas da cerimônia{" "}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setEditTemas((v) => !v)}
            >
              {editTemas ? "ok" : "editar"}
            </button>
          </label>
          {editTemas ? (
            <div className="checks">
              {temas.map((t) => {
                const on = p.temaIds.includes(t.id);
                return (
                  <label key={t.id} className={"check" + (on ? " on" : "")}>
                    <input type="checkbox" checked={on} onChange={() => toggleTema(t.id)} />
                    {t.nome}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="chips">
              {p.temaIds.length ? (
                p.temaIds.map((id) => (
                  <span className="chip" key={id}>
                    {temaNome.get(id)}
                  </span>
                ))
              ) : (
                <span className="note">Nenhum — clique em editar para definir.</span>
              )}
            </div>
          )}
        </div>
        {p.integranteIds.length > 0 && (
          <div className="form-row">
            <label className="lbl">Integrantes detectados</label>
            <div className="chips">
              {p.integranteIds.map((id) => (
                <span className="chip" key={id}>
                  {integNome.get(id)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {p.avisos.length > 0 && (
        <div className="card" style={{ borderColor: "#d8c295" }}>
          <h2 style={{ fontSize: "1rem" }}>Avisos do parser</h2>
          <ul className="note" style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {p.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>
          Músicas ({musicasIncluidas.length} de {p.musicas.length}) ·{" "}
          <span className="note">
            {novas} nova(s), {existentes} já no acervo
          </span>
        </h2>
        <ol className="songlist">
          {p.musicas.map((m, i) => {
            const fora = excluidos.has(i);
            return (
              <li
                className="song-row"
                key={i}
                style={fora ? { opacity: 0.45 } : undefined}
              >
                <label
                  className="check"
                  title="Incluir na importação"
                  style={{ marginRight: ".25rem" }}
                >
                  <input
                    type="checkbox"
                    checked={!fora}
                    onChange={() => toggleExcluir(i)}
                  />
                </label>
                <span className="song-num">{i + 1}</span>
                <div className="song-main" style={{ flex: "1 1 auto" }}>
                  <div className="song-name">
                    {m.nome || <em className="note">(sem nome)</em>}{" "}
                    <span
                      className="tag"
                      style={{
                        background: "var(--tag-bg)",
                        color: m.existenteId ? "var(--muted)" : "var(--accent-deep)",
                      }}
                    >
                      {m.existenteId ? "existe" : "nova"}
                    </span>
                    {m.isPercussao && <span className="tag">percussão</span>}
                  </div>
                  <div className="song-meta">
                    {m.cantorId ? `canta: ${integNome.get(m.cantorId)}` : "—"}
                    {m.capotraste ? ` · capo ${m.capotraste}` : ""}
                  </div>
                </div>
                <input
                  className="input"
                  value={m.tom ?? ""}
                  placeholder="tom"
                  onChange={(e) => setTom(i, e.target.value)}
                  style={{ width: "70px", textAlign: "center" }}
                  disabled={fora}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {p.poolDespacho.length > 0 && (
        <div className="card">
          <h2>
            Pool de despacho ({poolIncluido.length} de {p.poolDespacho.length})
          </h2>
          <ol className="songlist">
            {p.poolDespacho.map((m, i) => {
              const fora = excluidosPool.has(i);
              return (
                <li
                  className="song-row"
                  key={i}
                  style={fora ? { opacity: 0.45 } : undefined}
                >
                  <label
                    className="check"
                    title="Incluir na importação"
                    style={{ marginRight: ".25rem" }}
                  >
                    <input
                      type="checkbox"
                      checked={!fora}
                      onChange={() => toggleExcluir(i, true)}
                    />
                  </label>
                  <div className="song-main" style={{ flex: "1 1 auto" }}>
                    <div className="song-name">
                      {m.nome || <em className="note">(sem nome)</em>}{" "}
                      <span className="tag">{m.existenteId ? "existe" : "nova"}</span>
                    </div>
                  </div>
                  <input
                    className="input"
                    value={m.tom ?? ""}
                    placeholder="tom"
                    onChange={(e) => setTom(i, e.target.value, true)}
                    style={{ width: "70px", textAlign: "center" }}
                    disabled={fora}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" onClick={importar} disabled={busy}>
          {busy ? "Importando…" : "Importar cerimônia"}
        </button>
        <a href="/import" className="btn">
          Cancelar
        </a>
      </div>
    </>
  );
}
