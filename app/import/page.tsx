import Link from "next/link";
import { listArquivos } from "@/lib/import-service";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const arquivos = await listArquivos();

  return (
    <>
      <div className="page-head">
        <h1>Importar cerimônias</h1>
        <Link href="/cerimonias" className="btn">
          ← Voltar
        </Link>
      </div>
      <p className="sub">
        Arquivos <code>.docx</code> em <code>public/docs</code>. Clique para revisar o
        que o parser extraiu antes de gravar no acervo.
      </p>

      <div className="card">
        <ul className="rows">
          {arquivos.map((a) => (
            <li key={a}>
              <span className="who" style={{ fontFamily: "var(--sans)", fontSize: "0.95rem" }}>
                {a}
              </span>
              <Link href={`/import/${encodeURIComponent(a)}`} className="btn">
                Revisar →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
