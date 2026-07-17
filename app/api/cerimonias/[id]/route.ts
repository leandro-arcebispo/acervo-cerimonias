import { NextResponse } from "next/server";
import { atualizarCerimonia, removeCerimonia } from "@/lib/cerimonias";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  await atualizarCerimonia(Number(id), {
    nome,
    data: body?.data || null,
    local: typeof body?.local === "string" ? body.local.trim() || null : null,
    temaIds: Array.isArray(body?.temaIds) ? body.temaIds.map(Number) : [],
    integranteIds: Array.isArray(body?.integranteIds)
      ? body.integranteIds.map(Number)
      : [],
    itens: Array.isArray(body?.itens) ? body.itens : [],
    pool: Array.isArray(body?.pool) ? body.pool : [],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await removeCerimonia(Number(id));
  return NextResponse.json({ ok: true });
}
