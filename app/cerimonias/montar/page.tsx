import Link from "next/link";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import MontarCerimonia from "@/components/MontarCerimonia";

export const dynamic = "force-dynamic";

export default async function MontarPage() {
  const [temas, integrantes] = await Promise.all([listTemas(), listIntegrantes()]);

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
      />
    </>
  );
}
