"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Instrumento {
  id: number;
  nome: string;
}

interface Integrante {
  id: number;
  nome: string;
  ativo: number;
  observacoes: string | null;
  instrumentos: number[];
  instrumentos_nomes: string;
}

interface FormState {
  id?: number;
  nome: string;
  ativo: boolean;
  observacoes: string;
  instrumentos: number[];
}

const EMPTY: FormState = {
  nome: "",
  ativo: true,
  observacoes: "",
  instrumentos: [],
};

export default function IntegrantesManager({
  initial,
  instrumentos,
}: {
  initial: Integrante[];
  instrumentos: Instrumento[];
}) {
  const router = useRouter();
  const [lista, setLista] = useState<Integrante[]>(initial);
  const [form, setForm] = useState<FormState | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/integrantes");
    setLista(await r.json());
    router.refresh();
  }

  function toggleInst(id: number) {
    setForm((f) =>
      f
        ? {
            ...f,
            instrumentos: f.instrumentos.includes(id)
              ? f.instrumentos.filter((x) => x !== id)
              : [...f.instrumentos, id],
          }
        : f
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const nome = form.nome.trim();
    if (!nome) {
      setErro("Nome é obrigatório.");
      return;
    }
    setBusy(true);
    setErro(null);
    const payload = {
      nome,
      ativo: form.ativo ? 1 : 0,
      observacoes: form.observacoes.trim() || null,
      instrumentos: form.instrumentos,
    };
    const r = await fetch(
      form.id ? `/api/integrantes/${form.id}` : "/api/integrantes",
      {
        method: form.id ? "PATCH" : "POST",
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
    setForm(null);
    await load();
  }

  async function del(i: Integrante) {
    if (!confirm(`Excluir ${i.nome}?`)) return;
    await fetch(`/api/integrantes/${i.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      {!form && (
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm({ ...EMPTY });
              setErro(null);
            }}
          >
            + Novo integrante
          </button>
        </div>
      )}

      {form && (
        <form className="form" onSubmit={salvar}>
          <div className="form-row">
            <label className="lbl">Nome</label>
            <input
              className="input"
              value={form.nome}
              autoFocus
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label className="lbl">Instrumentos</label>
            <div className="checks">
              {instrumentos.map((ins) => {
                const on = form.instrumentos.includes(ins.id);
                return (
                  <label key={ins.id} className={"check" + (on ? " on" : "")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleInst(ins.id)}
                    />
                    {ins.nome}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-row">
            <label className="lbl">Observações</label>
            <textarea
              className="textarea"
              style={{ minHeight: "70px" }}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label className="check">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Ativo
            </label>
          </div>

          {erro && <p className="erro">{erro}</p>}

          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy}>
              {form.id ? "Salvar" : "Criar"}
            </button>
            <button type="button" className="btn" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <ul className="rows">
          {lista.map((i) => (
            <li key={i.id}>
              <span className="who">
                {i.nome}
                {!i.ativo && (
                  <span className="tag" style={{ marginLeft: "0.5rem" }}>
                    inativo
                  </span>
                )}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}
              >
                <span className="what">{i.instrumentos_nomes || "—"}</span>
                <span className="row-actions">
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setForm({
                        id: i.id,
                        nome: i.nome,
                        ativo: !!i.ativo,
                        observacoes: i.observacoes || "",
                        instrumentos: [...i.instrumentos],
                      });
                      setErro(null);
                    }}
                  >
                    editar
                  </button>
                  <button className="icon-btn" onClick={() => del(i)}>
                    excluir
                  </button>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
