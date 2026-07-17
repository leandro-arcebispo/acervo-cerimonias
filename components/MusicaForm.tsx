"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Opt {
  id: number;
  nome: string;
}

const TAGS: { key: "is_percussao" | "is_coro" | "is_violao" | "is_acapella"; label: string }[] = [
  { key: "is_percussao", label: "Percussão" },
  { key: "is_coro", label: "Coro" },
  { key: "is_violao", label: "Violão" },
  { key: "is_acapella", label: "Acapella" },
];

interface Initial {
  id: number;
  nome: string;
  autor_compositor: string | null;
  is_percussao: number;
  is_coro: number;
  is_violao: number;
  is_acapella: number;
  status: string;
  letra: string | null;
  cantor_habitual_id: number | null;
  tom_padrao: string | null;
  observacoes: string | null;
  temas: number[];
}

export default function MusicaForm({
  initial,
  temas,
  integrantes,
}: {
  initial?: Initial | null;
  temas: Opt[];
  integrantes: Opt[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [autor, setAutor] = useState(initial?.autor_compositor ?? "");
  const [status, setStatus] = useState(initial?.status ?? "consolidada");
  const [tags, setTags] = useState<string[]>(() =>
    TAGS.filter((t) => initial?.[t.key]).map((t) => t.key)
  );
  const [cantor, setCantor] = useState(
    initial?.cantor_habitual_id ? String(initial.cantor_habitual_id) : ""
  );
  const [tom, setTom] = useState(initial?.tom_padrao ?? "");
  const [selTemas, setSelTemas] = useState<number[]>(initial?.temas ?? []);
  const [letra, setLetra] = useState(initial?.letra ?? "");
  const [obs, setObs] = useState(initial?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleTema(id: number) {
    setSelTemas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleTag(key: string) {
    setTags((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  }

  /** Editando: volta pra onde a pessoa veio (ex.: preview da cerimônia).
   *  Criando: não há "de onde veio", cai na listagem. */
  function voltarOuLista() {
    if (initial && window.history.length > 1) {
      router.back();
    } else {
      router.push("/musicas");
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      setErro("Nome é obrigatório.");
      return;
    }
    setBusy(true);
    setErro(null);
    const payload = {
      nome: n,
      autor_compositor: autor.trim() || null,
      status,
      is_percussao: tags.includes("is_percussao") ? 1 : 0,
      is_coro: tags.includes("is_coro") ? 1 : 0,
      is_violao: tags.includes("is_violao") ? 1 : 0,
      is_acapella: tags.includes("is_acapella") ? 1 : 0,
      cantor_habitual_id: cantor ? Number(cantor) : null,
      tom_padrao: tom.trim() || null,
      temas: selTemas,
      letra: letra.trim() || null,
      observacoes: obs.trim() || null,
    };
    const r = await fetch(
      initial ? `/api/musicas/${initial.id}` : "/api/musicas",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao salvar.");
      return;
    }
    voltarOuLista();
    router.refresh();
  }

  async function excluir() {
    if (!initial) return;
    if (!confirm(`Excluir a música "${initial.nome}"?`)) return;
    await fetch(`/api/musicas/${initial.id}`, { method: "DELETE" });
    router.push("/musicas");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={salvar}>
      <div className="form-row">
        <label className="lbl">Nome</label>
        <input
          className="input"
          value={nome}
          autoFocus
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label className="lbl">Compositor / autor / banda</label>
        <input
          className="input"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
      </div>

      <div
        className="form-row"
        style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
      >
        <div style={{ flex: "1 1 160px" }}>
          <label className="lbl">Status</label>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="inedita">Inédita</option>
            <option value="consolidada">Consolidada</option>
            <option value="aposentada">Aposentada</option>
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label className="lbl">Cantor habitual</label>
          <select
            className="select"
            value={cantor}
            onChange={(e) => setCantor(e.target.value)}
          >
            <option value="">—</option>
            {integrantes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 1 100px" }}>
          <label className="lbl">Tom</label>
          <input
            className="input"
            value={tom}
            placeholder="Ex.: Am"
            onChange={(e) => setTom(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="lbl">Temas</label>
        <div className="checks">
          {temas.map((t) => {
            const on = selTemas.includes(t.id);
            return (
              <label key={t.id} className={"check" + (on ? " on" : "")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleTema(t.id)}
                />
                {t.nome}
              </label>
            );
          })}
        </div>
      </div>

      <div className="form-row">
        <label className="lbl">Letra</label>
        <textarea
          className="textarea"
          style={{ minHeight: "260px", fontFamily: "var(--serif)" }}
          value={letra}
          onChange={(e) => setLetra(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label className="lbl">Observações</label>
        <textarea
          className="textarea"
          style={{ minHeight: "70px" }}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label className="lbl">Tags</label>
        <div className="checks">
          {TAGS.map((t) => {
            const on = tags.includes(t.key);
            return (
              <label key={t.key} className={"check" + (on ? " on" : "")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleTag(t.key)}
                />
                {t.label}
              </label>
            );
          })}
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {initial ? "Salvar" : "Criar música"}
        </button>
        <button type="button" className="btn" onClick={voltarOuLista}>
          Cancelar
        </button>
        {initial && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginLeft: "auto" }}
            onClick={excluir}
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
