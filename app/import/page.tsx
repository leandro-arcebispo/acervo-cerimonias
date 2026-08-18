import Link from "next/link";
import { listArquivos } from "@/lib/import-service";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import ImportUpload from "@/components/ImportUpload";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [arquivos, temas, integrantes] = await Promise.all([
    listArquivos(),
    listTemas(),
    listIntegrantes(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Importar cerimônias</h1>
        <Link href="/cerimonias" className="btn">
          ← Voltar
        </Link>
      </div>

      <ImportUpload
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes.map((i) => ({ id: i.id, nome: i.nome }))}
      />

      <p className="sub" style={{ marginTop: "2rem" }}>
        Ou escolha um dos arquivos <code>.docx</code> já em <code>public/docs</code>.
        Clique para revisar o que o parser extraiu antes de gravar no acervo.
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
