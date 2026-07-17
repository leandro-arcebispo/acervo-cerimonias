import { NextResponse } from "next/server";
import { listIntegrantes, createIntegrante } from "@/lib/integrantes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listIntegrantes());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  const instrumentos = Array.isArray(body?.instrumentos)
    ? body.instrumentos.map(Number).filter((n: number) => Number.isFinite(n))
    : [];
  const integrante = await createIntegrante({
    nome,
    ativo: body?.ativo === 0 ? 0 : 1,
    observacoes: body?.observacoes ?? null,
    instrumentos,
  });
  return NextResponse.json(integrante, { status: 201 });
}
