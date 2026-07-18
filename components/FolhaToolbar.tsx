"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

export default function FolhaToolbar({
  cerimoniaId,
  children,
}: {
  cerimoniaId: number;
  children: React.ReactNode;
}) {
  const [scale, setScale] = useState(1.3);
  const [pretoEBranco, setPretoEBranco] = useState(false);
  const [modoCifra, setModoCifra] = useState(false);
  const [colunas, setColunas] = useState(2);

  return (
    <>
      <div className="page-head no-print" style={{ justifyContent: "flex-end" }}>
        <div className="folha-toolbar-actions">
          <Link href="/cerimonias" className="btn">
            ← Voltar
          </Link>
          <Link href={`/cerimonias/${cerimoniaId}/editar`} className="btn">
            Editar
          </Link>
          <label className="folha-font-control">
            <span>Fonte</span>
            <select
              className="select"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            >
              <option value={0.85}>Pequena</option>
              <option value={1}>Normal</option>
              <option value={1.15}>Grande</option>
              <option value={1.3}>Muito grande</option>
            </select>
          </label>
          <label className="folha-font-control">
            <input
              type="checkbox"
              checked={pretoEBranco}
              onChange={(e) => setPretoEBranco(e.target.checked)}
            />
            <span>Versão de impressão preto e branco</span>
          </label>
          <label className="folha-font-control">
            <input
              type="checkbox"
              checked={modoCifra}
              onChange={(e) => setModoCifra(e.target.checked)}
            />
            <span>Ver cifra (acordes)</span>
          </label>
          <label className="folha-font-control">
            <span>Colunas</span>
            <select
              className="select"
              value={colunas}
              onChange={(e) => setColunas(Number(e.target.value))}
            >
              <option value={2}>2 colunas</option>
              <option value={1}>1 coluna</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
        </div>
      </div>
      <div
        className={`folha${pretoEBranco ? " folha-pb" : ""}${modoCifra ? " folha-modo-cifra" : ""}`}
        style={{ "--folha-scale": scale, "--folha-colunas": colunas } as CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
