import Link from "next/link";
import { notFound } from "next/navigation";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
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

  const [temas, integrantesAll] = await Promise.all([listTemas(), listIntegrantes()]);

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
        cerimoniaId={dados.id}
        initial={dados}
      />
    </>
  );
}
