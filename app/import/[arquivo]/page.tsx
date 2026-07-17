import Link from "next/link";
import { preview } from "@/lib/import-service";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import ImportStaging from "@/components/ImportStaging";

export const dynamic = "force-dynamic";

export default async function ImportArquivoPage({
  params,
}: {
  params: Promise<{ arquivo: string }>;
}) {
  const { arquivo } = await params;
  const nome = decodeURIComponent(arquivo);

  const [prev, temas, integrantes] = await Promise.all([
    preview(nome),
    listTemas(),
    listIntegrantes(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Revisar import</h1>
        <Link href="/import" className="btn">
          ← Voltar
        </Link>
      </div>
      <ImportStaging
        preview={prev}
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes.map((i) => ({ id: i.id, nome: i.nome }))}
      />
    </>
  );
}
