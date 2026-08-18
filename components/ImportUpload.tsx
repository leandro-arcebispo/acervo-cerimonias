"use client";

import { useRef, useState } from "react";
import ImportStaging from "./ImportStaging";
import type { Preview } from "@/lib/import-service";

interface Opt {
  id: number;
  nome: string;
}

export default function ImportUpload({
  temas,
  integrantes,
}: {
  temas: Opt[];
  integrantes: Opt[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const arquivo = inputRef.current?.files?.[0];
    if (!arquivo) {
      setErro("Selecione um arquivo .docx.");
      return;
    }
    setBusy(true);
    setErro(null);
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    const r = await fetch("/api/import/upload", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error || "Erro ao enviar o arquivo.");
      return;
    }
    setPreview(await r.json());
  }

  if (preview) {
    return <ImportStaging preview={preview} temas={temas} integrantes={integrantes} />;
  }

  return (
    <form className="card" onSubmit={enviar}>
      <div className="form-row">
        <label className="lbl">Enviar novo arquivo (.docx)</label>
        <input ref={inputRef} type="file" accept=".docx" className="input" />
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Processando…" : "Enviar e revisar"}
        </button>
      </div>
    </form>
  );
}
