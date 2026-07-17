import { listIntegrantes, listInstrumentos } from "@/lib/integrantes";
import IntegrantesManager from "@/components/IntegrantesManager";

export const dynamic = "force-dynamic";

export default async function IntegrantesPage() {
  const [integrantes, instrumentos] = await Promise.all([
    listIntegrantes(),
    listInstrumentos(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>
          Integrantes <span className="count">· {integrantes.length}</span>
        </h1>
      </div>
      <IntegrantesManager initial={integrantes} instrumentos={instrumentos} />
    </>
  );
}
