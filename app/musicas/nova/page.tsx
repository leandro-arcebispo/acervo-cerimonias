import Link from "next/link";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import MusicaForm from "@/components/MusicaForm";

export const dynamic = "force-dynamic";

export default async function NovaMusicaPage() {
  const [temas, integrantes] = await Promise.all([
    listTemas(),
    listIntegrantes(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Nova música</h1>
        <Link href="/musicas" className="btn">
          ← Voltar
        </Link>
      </div>
      <MusicaForm
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes
          .filter((i) => i.ativo)
          .map((i) => ({ id: i.id, nome: i.nome }))}
      />
    </>
  );
}
