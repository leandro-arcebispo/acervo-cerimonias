import { notFound } from "next/navigation";
import { getMusica } from "@/lib/musicas";
import { listTemas } from "@/lib/temas";
import { listIntegrantes } from "@/lib/integrantes";
import MusicaForm from "@/components/MusicaForm";
import VoltarButton from "@/components/VoltarButton";

export const dynamic = "force-dynamic";

export default async function EditarMusicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const musica = await getMusica(Number(id));
  if (!musica) notFound();

  const [temas, integrantes] = await Promise.all([
    listTemas(),
    listIntegrantes(),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>{musica.nome}</h1>
        <VoltarButton fallbackHref="/musicas" />
      </div>
      <MusicaForm
        initial={musica}
        temas={temas.map((t) => ({ id: t.id, nome: t.nome }))}
        integrantes={integrantes
          .filter((i) => i.ativo || i.id === musica.cantor_habitual_id)
          .map((i) => ({ id: i.id, nome: i.nome }))}
      />
    </>
  );
}
