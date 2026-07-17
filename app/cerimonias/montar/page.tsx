import Link from "next/link";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import { all } from "@/lib/db";
import MontarCerimonia from "@/components/MontarCerimonia";

export const dynamic = "force-dynamic";

export default async function MontarPage() {
  const [temas, integrantes, locais] = await Promise.all([
    listTemas(),
    listIntegrantes(),
    all<{ id: number; nome: string; is_default: number }>(
      "SELECT id, nome, is_default FROM locais ORDER BY is_default DESC, nome"
    ),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Montar cerimônia</h1>
        <Link href="/cerimonias" className="btn">
          ← Voltar
        </Link>
      </div>
      <MontarCerimonia
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes
          .filter((i) => i.ativo)
          .map((i) => ({ id: i.id, nome: i.nome }))}
        locais={locais.map((l) => ({ id: l.id, nome: l.nome, isDefault: l.is_default }))}
      />
    </>
  );
}
