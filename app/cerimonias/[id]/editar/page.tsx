import Link from "next/link";
import { notFound } from "next/navigation";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import { all } from "@/lib/db";
import { getCerimoniaParaEditar } from "@/lib/cerimonias";
import MontarCerimonia from "@/components/MontarCerimonia";

export const dynamic = "force-dynamic";

export default async function EditarCerimoniaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await getCerimoniaParaEditar(Number(id));
  if (!dados) notFound();

  const [temas, integrantesAll, locais] = await Promise.all([
    listTemas(),
    listIntegrantes(),
    all<{ id: number; nome: string; is_default: number }>(
      "SELECT id, nome, is_default FROM locais ORDER BY is_default DESC, nome"
    ),
  ]);

  const referenciados = new Set<number>([
    ...dados.integranteIds,
    ...dados.itens.flatMap((i) => i.cantorIds),
  ]);
  const integrantes = integrantesAll.filter((i) => i.ativo || referenciados.has(i.id));

  return (
    <>
      <div className="page-head">
        <h1>Editar cerimônia</h1>
        <Link href={`/cerimonias/${id}`} className="btn">
          ← Voltar
        </Link>
      </div>
      <MontarCerimonia
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes.map((i) => ({ id: i.id, nome: i.nome }))}
        locais={locais.map((l) => ({ id: l.id, nome: l.nome, isDefault: l.is_default }))}
        cerimoniaId={dados.id}
        initial={dados}
      />
    </>
  );
}
