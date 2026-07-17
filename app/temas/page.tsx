import { listTemas } from "@/lib/temas";
import TemasManager from "@/components/TemasManager";

export const dynamic = "force-dynamic";

export default async function TemasPage() {
  const temas = await listTemas();

  return (
    <>
      <div className="page-head">
        <h1>
          Temas <span className="count">· {temas.length}</span>
        </h1>
      </div>
      <TemasManager initial={temas} />
    </>
  );
}
