import { NextResponse } from "next/server";
import { commit, type Preview } from "@/lib/import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Preview | null;
  if (!body || !body.titulo || !Array.isArray(body.musicas)) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  try {
    const res = await commit(body);
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Erro ao importar." },
      { status: 500 }
    );
  }
}
