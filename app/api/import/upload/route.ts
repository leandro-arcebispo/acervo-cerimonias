import { NextResponse } from "next/server";
import { previewFromBuffer } from "@/lib/import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!arquivo.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Envie um arquivo .docx." }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await arquivo.arrayBuffer());
    const prev = await previewFromBuffer(buf, arquivo.name);
    return NextResponse.json(prev);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Erro ao processar o arquivo." },
      { status: 500 }
    );
  }
}
