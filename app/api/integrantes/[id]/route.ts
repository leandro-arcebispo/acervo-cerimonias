import { NextResponse } from "next/server";
import { updateIntegrante, removeIntegrante } from "@/lib/integrantes";
import type { IntegranteInput } from "@/lib/integrantes";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const patch: Partial<IntegranteInput> = {};

  if (typeof body?.nome === "string") {
    const nome = body.nome.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    patch.nome = nome;
  }
  if (body && "ativo" in body) patch.ativo = body.ativo ? 1 : 0;
  if (body && "observacoes" in body) patch.observacoes = body.observacoes ?? null;
  if (Array.isArray(body?.instrumentos)) {
    patch.instrumentos = body.instrumentos
      .map(Number)
      .filter((n: number) => Number.isFinite(n));
  }

  const integrante = await updateIntegrante(Number(id), patch);
  if (!integrante) {
    return NextResponse.json(
      { error: "Integrante não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json(integrante);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await removeIntegrante(Number(id));
  return NextResponse.json({ ok: true });
}
