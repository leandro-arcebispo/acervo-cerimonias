import { NextResponse } from "next/server";
import { listTemas, createTema } from "@/lib/temas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listTemas());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  try {
    const tema = await createTema({ nome, descricao: body?.descricao ?? null });
    return NextResponse.json(tema, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Já existe um tema com esse nome." },
      { status: 409 }
    );
  }
}
