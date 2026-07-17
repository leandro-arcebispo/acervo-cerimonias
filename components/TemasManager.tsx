"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Tema {
  id: number;
  nome: string;
  descricao: string | null;
  n_musicas: number;
}

export default function TemasManager({ initial }: { initial: Tema[] }) {
  const router = useRouter();
  const [temas, setTemas] = useState<Tema[]>(initial);
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/temas");
    setTemas(await r.json());
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    setBusy(true);
    setErro(null);
    const r = await fetch("/api/temas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao criar tema.");
      return;
    }
    setNovo("");
    await load();
  }

  async function save(id: number) {
    const nome = editNome.trim();
    if (!nome) return;
    const r = await fetch(`/api/temas/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao salvar.");
      return;
    }
    setEditId(null);
    setErro(null);
    await load();
  }

  async function del(t: Tema) {
    const aviso =
      t.n_musicas > 0
        ? `Excluir o tema "${t.nome}"? Ele será removido de ${t.n_musicas} música(s).`
        : `Excluir o tema "${t.nome}"?`;
    if (!confirm(aviso)) return;
    await fetch(`/api/temas/${t.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <form
        className="form"
        onSubmit={add}
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
      >
        <input
          className="input"
          placeholder="Novo tema…"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy}>
          Adicionar
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      <div className="tema-grid">
        {temas.map((t) => (
          <div className="tema-card" key={t.id}>
            {editId === t.id ? (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  className="input"
                  value={editNome}
                  autoFocus
                  onChange={(e) => setEditNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save(t.id)}
                />
                <button className="icon-btn" onClick={() => save(t.id)}>
                  ok
                </button>
                <button className="icon-btn" onClick={() => setEditId(null)}>
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="nome">{t.nome}</div>
                <div className="qtd">
                  {t.n_musicas} {t.n_musicas === 1 ? "música" : "músicas"}
                </div>
                <div className="row-actions" style={{ marginTop: "0.55rem" }}>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setEditId(t.id);
                      setEditNome(t.nome);
                      setErro(null);
                    }}
                  >
                    editar
                  </button>
                  <button className="icon-btn" onClick={() => del(t)}>
                    excluir
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
