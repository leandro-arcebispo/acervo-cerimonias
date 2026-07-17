"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CerimoniaParaEditar } from "@/lib/cerimonias";

interface Opt {
  id: number;
  nome: string;
}
interface Sugestao {
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

interface Item {
  key: number;
  tipo: "musica" | "despacho" | "quebra";
  musicaId?: number;
  nome?: string;
  tom: string;
  cantorIds: number[];
}
interface PoolItem {
  key: number;
  musicaId: number;
  nome: string;
  tom: string;
}

export default function MontarCerimonia({
  temas,
  integrantes,
  cerimoniaId,
  initial,
}: {
  temas: Opt[];
  integrantes: Opt[];
  cerimoniaId?: number;
  initial?: CerimoniaParaEditar;
}) {
  const router = useRouter();
  const keyRef = useRef(1);
  const nextKey = () => keyRef.current++;

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [data, setData] = useState(initial?.data ?? "");
  const [local, setLocal] = useState(initial?.local ?? "");
  const [temaIds, setTemaIds] = useState<number[]>(initial?.temaIds ?? []);
  const [presentes, setPresentes] = useState<number[]>(
    initial?.integranteIds ?? integrantes.map((i) => i.id)
  );
  const [editTemas, setEditTemas] = useState(!initial);
  const [editPresentes, setEditPresentes] = useState(false);

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>(
    () =>
      initial?.itens.map((it) => ({
        key: nextKey(),
        tipo: it.tipo,
        musicaId: it.musicaId,
        nome: it.nome,
        tom: it.tom,
        cantorIds: it.cantorIds,
      })) ?? []
  );
  const [pool, setPool] = useState<PoolItem[]>(
    () =>
      initial?.pool.map((p) => ({
        key: nextKey(),
        musicaId: p.musicaId,
        nome: p.nome,
        tom: p.tom,
      })) ?? []
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const qs = temaIds.length ? `?temas=${temaIds.join(",")}` : "";
    fetch(`/api/montagem/sugestoes${qs}`)
      .then((r) => r.json())
      .then(setSugestoes)
      .catch(() => setSugestoes([]));
  }, [temaIds]);

  const integNome = useMemo(
    () => new Map(integrantes.map((i) => [i.id, i.nome])),
    [integrantes]
  );
  const presentesSet = useMemo(() => new Set(presentes), [presentes]);
  const cantores = presentes.length
    ? integrantes.filter((i) => presentesSet.has(i.id))
    : integrantes;

  const idsUsados = useMemo(
    () => new Set(itens.filter((i) => i.musicaId).map((i) => i.musicaId)),
    [itens]
  );

  const sugestoesFiltradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return sugestoes
      .filter((s) => !idsUsados.has(s.id))
      .filter((s) => !b || s.nome.toLowerCase().includes(b))
      .sort((a, c) => c.vezesTocada - a.vezesTocada || a.nome.localeCompare(c.nome));
  }, [sugestoes, busca, idsUsados]);

  function toggle(list: number[], set: (v: number[]) => void, id: number) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function addMusica(s: Sugestao) {
    setItens((prev) => [
      ...prev,
      {
        key: nextKey(),
        tipo: "musica",
        musicaId: s.id,
        nome: s.nome,
        tom: s.tomMaisUsado ?? "",
        cantorIds: s.cantorHabitualId != null ? [s.cantorHabitualId] : [],
      },
    ]);
  }
  function addPool(s: Sugestao) {
    if (pool.some((p) => p.musicaId === s.id)) return;
    setPool((prev) => [
      ...prev,
      { key: nextKey(), musicaId: s.id, nome: s.nome, tom: s.tomMaisUsado ?? "" },
    ]);
  }
  function addDespacho() {
    setItens((prev) => [
      ...prev,
      { key: nextKey(), tipo: "despacho", tom: "", cantorIds: [] },
    ]);
  }
  function addQuebra() {
    setItens((prev) => [
      ...prev,
      { key: nextKey(), tipo: "quebra", tom: "", cantorIds: [] },
    ]);
  }
  function removeItem(key: number) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }
  function moveItem(idx: number, dir: -1 | 1) {
    setItens((prev) => {
      const arr = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  }
  function setItem(key: number, patch: Partial<Item>) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro("Dê um nome à cerimônia.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const payload = {
      nome: nome.trim(),
      data: data || null,
      local: local.trim() || null,
      temaIds,
      integranteIds: presentes,
      itens: (() => {
        let n = 0;
        return itens.map((i) =>
          i.tipo === "quebra"
            ? { tipo: "quebra" }
            : i.tipo === "despacho"
            ? { tipo: "despacho", marcador: `${++n}º Despacho` }
            : {
                tipo: "musica",
                musicaId: i.musicaId,
                tom: i.tom || null,
                cantorIds: i.cantorIds,
              }
        );
      })(),
      pool: pool.map((p) => ({ musicaId: p.musicaId, tom: p.tom || null })),
    };
    const r = await fetch(
      cerimoniaId ? `/api/cerimonias/${cerimoniaId}` : "/api/cerimonias",
      {
        method: cerimoniaId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSalvando(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao salvar.");
      return;
    }
    router.push(cerimoniaId ? `/cerimonias/${cerimoniaId}` : "/cerimonias");
    router.refresh();
  }

  let numero = 0;
  let despachoNum = 0;

  return (
    <>
      <div className="card">
        <div className="form-row" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 240px" }}>
            <label className="lbl">Nome da cerimônia</label>
            <input
              className="input"
              value={nome}
              placeholder="Ex.: Viver em Essência"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <label className="lbl">Data</label>
            <input
              className="input"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div style={{ flex: "1 1 130px" }}>
            <label className="lbl">Local</label>
            <input
              className="input"
              value={local}
              placeholder="Ex.: Casa de Cura"
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <label className="lbl">
            Temas{" "}
            <button type="button" className="icon-btn" onClick={() => setEditTemas((v) => !v)}>
              {editTemas ? "ok" : "editar"}
            </button>
          </label>
          {editTemas ? (
            <div className="checks">
              {temas.map((t) => {
                const on = temaIds.includes(t.id);
                return (
                  <label key={t.id} className={"check" + (on ? " on" : "")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(temaIds, setTemaIds, t.id)}
                    />
                    {t.nome}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="chips">
              {temaIds.length ? (
                temaIds.map((id) => (
                  <span className="chip" key={id}>
                    {temas.find((t) => t.id === id)?.nome}
                  </span>
                ))
              ) : (
                <span className="note">Selecione temas para filtrar o repertório.</span>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <label className="lbl">
            Quem vai tocar ({presentes.length}){" "}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setEditPresentes((v) => !v)}
            >
              {editPresentes ? "ok" : "editar"}
            </button>
          </label>
          {editPresentes ? (
            <div className="checks">
              {integrantes.map((i) => {
                const on = presentes.includes(i.id);
                return (
                  <label key={i.id} className={"check" + (on ? " on" : "")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(presentes, setPresentes, i.id)}
                    />
                    {i.nome}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="chips">
              {presentes.map((id) => (
                <span className="chip" key={id}>
                  {integNome.get(id)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="builder">
        <div className="panel">
          <h2>Repertório</h2>
          <div className="field" style={{ marginBottom: "0.75rem", maxWidth: "none" }}>
            <span aria-hidden="true">&#9906;</span>
            <input
              value={busca}
              placeholder="Buscar música…"
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {sugestoesFiltradas.length === 0 ? (
            <p className="note">
              {temaIds.length
                ? "Nenhuma música para esses temas ainda."
                : "Selecione temas ou busque no acervo."}
            </p>
          ) : (
            <ul className="rep-list">
              {sugestoesFiltradas.map((s) => {
                const semCantor =
                  s.cantorHabitualId != null && !presentesSet.has(s.cantorHabitualId);
                return (
                  <li className="rep-row" key={s.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="rep-nome">{s.nome}</div>
                      <div className="rep-meta">
                        {s.vezesTocada > 0
                          ? `${s.vezesTocada}× · último ${s.ultimaData ?? "—"}`
                          : "inédita no acervo"}
                        {s.tomMaisUsado ? ` · ${s.tomMaisUsado}` : ""}
                        {s.cantorHabitualNome
                          ? ` · ${s.cantorHabitualNome}${semCantor ? " (ausente)" : ""}`
                          : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem", flex: "0 0 auto" }}>
                      <button
                        className="icon-btn mini"
                        title="Adicionar à cerimônia"
                        onClick={() => addMusica(s)}
                      >
                        + música
                      </button>
                      <button
                        className="icon-btn mini"
                        title="Adicionar ao pool de despacho"
                        onClick={() => addPool(s)}
                      >
                        pool
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2>
            Cerimônia{" "}
            <span className="note">
              ({itens.filter((i) => i.tipo === "musica").length} músicas)
            </span>
          </h2>

          {itens.length === 0 ? (
            <p className="note">
              Adicione músicas do repertório ao lado. A numeração é automática.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {itens.map((it, idx) => {
                if (it.tipo === "quebra") {
                  return (
                    <li className="quebra-item" key={it.key}>
                      <span>⤓ Quebra de página</span>
                      <span className="row-actions">
                        <button className="icon-btn mini" onClick={() => moveItem(idx, -1)}>
                          ↑
                        </button>
                        <button className="icon-btn mini" onClick={() => moveItem(idx, 1)}>
                          ↓
                        </button>
                        <button className="icon-btn mini" onClick={() => removeItem(it.key)}>
                          ✕
                        </button>
                      </span>
                    </li>
                  );
                }
                if (it.tipo === "despacho") {
                  despachoNum++;
                  return (
                    <li className="despacho-item" key={it.key}>
                      <span>◈ {despachoNum}º Despacho</span>
                      <span className="row-actions">
                        <button className="icon-btn mini" onClick={() => moveItem(idx, -1)}>
                          ↑
                        </button>
                        <button className="icon-btn mini" onClick={() => moveItem(idx, 1)}>
                          ↓
                        </button>
                        <button className="icon-btn mini" onClick={() => removeItem(it.key)}>
                          ✕
                        </button>
                      </span>
                    </li>
                  );
                }
                numero++;
                return (
                  <li className="item-row" key={it.key}>
                    <span className="song-num">{numero}</span>
                    <span className="item-nome">{it.nome}</span>
                    <input
                      className="input tom-in"
                      value={it.tom}
                      placeholder="tom"
                      onChange={(e) => setItem(it.key, { tom: e.target.value })}
                    />
                    <div className="cantor-multi">
                      {cantores.length === 0 && (
                        <span className="note">sem integrantes</span>
                      )}
                      {cantores.map((c) => {
                        const on = it.cantorIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={"chip-toggle" + (on ? " on" : "")}
                            onClick={() =>
                              setItem(it.key, {
                                cantorIds: on
                                  ? it.cantorIds.filter((x) => x !== c.id)
                                  : [...it.cantorIds, c.id],
                              })
                            }
                          >
                            {c.nome}
                          </button>
                        );
                      })}
                    </div>
                    <span className="row-actions">
                      <button className="icon-btn mini" onClick={() => moveItem(idx, -1)}>
                        ↑
                      </button>
                      <button className="icon-btn mini" onClick={() => moveItem(idx, 1)}>
                        ↓
                      </button>
                      <button className="icon-btn mini" onClick={() => removeItem(it.key)}>
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button className="btn" onClick={addDespacho}>
              ◈ Inserir despacho
            </button>
            <button className="btn" onClick={addQuebra}>
              ⤓ Inserir quebra de página
            </button>
          </div>

          {pool.length > 0 && (
            <>
              <h2 style={{ marginTop: "1.5rem" }}>Pool de despacho</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {pool.map((p) => (
                  <li className="item-row" key={p.key}>
                    <span className="item-nome">{p.nome}</span>
                    <input
                      className="input tom-in"
                      value={p.tom}
                      placeholder="tom"
                      onChange={(e) =>
                        setPool((prev) =>
                          prev.map((x) =>
                            x.key === p.key ? { ...x, tom: e.target.value } : x
                          )
                        )
                      }
                    />
                    <button
                      className="icon-btn mini"
                      onClick={() =>
                        setPool((prev) => prev.filter((x) => x.key !== p.key))
                      }
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {erro && <p className="erro" style={{ marginTop: "1rem" }}>{erro}</p>}

          <div className="form-actions">
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando
                ? "Salvando…"
                : cerimoniaId
                  ? "Salvar alterações"
                  : "Salvar cerimônia"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
