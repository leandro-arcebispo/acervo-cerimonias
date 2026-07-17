import { NextResponse } from "next/server";
import { updateTema, removeTema } from "@/lib/temas";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const patch: { nome?: string; descricao?: string | null } = {};
  if (typeof body?.nome === "string") {
    const nome = body.nome.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    patch.nome = nome;
  }
  if (body && "descricao" in body) patch.descricao = body.descricao ?? null;

  try {
    const tema = await updateTema(Number(id), patch);
    if (!tema) {
      return NextResponse.json({ error: "Tema não encontrado." }, { status: 404 });
    }
    return NextResponse.json(tema);
  } catch {
    return NextResponse.json(
      { error: "Já existe um tema com esse nome." },
      { status: 409 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await removeTema(Number(id));
  return NextResponse.json({ ok: true });
}
