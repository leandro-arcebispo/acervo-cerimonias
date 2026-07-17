import { NextResponse } from "next/server";
import { criarCerimonia } from "@/lib/cerimonias";
import { all } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cerimonias = await all(
    "SELECT id, nome, data, local_id FROM cerimonias ORDER BY data DESC, id DESC"
  );
  return NextResponse.json(cerimonias);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  const id = await criarCerimonia({
    nome,
    data: body?.data || null,
    localId: body?.localId ?? null,
    temaIds: Array.isArray(body?.temaIds) ? body.temaIds.map(Number) : [],
    integranteIds: Array.isArray(body?.integranteIds)
      ? body.integranteIds.map(Number)
      : [],
    itens: Array.isArray(body?.itens) ? body.itens : [],
    pool: Array.isArray(body?.pool) ? body.pool : [],
  });
  return NextResponse.json({ id }, { status: 201 });
}
