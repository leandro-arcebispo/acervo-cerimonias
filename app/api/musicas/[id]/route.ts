import { NextResponse } from "next/server";
import { updateMusica, removeMusica } from "@/lib/musicas";
import type { MusicaInput } from "@/lib/musicas";
import type { MusicaStatus } from "@/lib/types";

export const runtime = "nodejs";

const STATUS: MusicaStatus[] = ["inedita", "consolidada", "aposentada"];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const patch: Partial<MusicaInput> = {};

  if (typeof body?.nome === "string") {
    const nome = body.nome.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    patch.nome = nome;
  }
  if (body && "autor_compositor" in body)
    patch.autor_compositor = body.autor_compositor?.trim() || null;
  if (body && "is_percussao" in body) patch.is_percussao = body.is_percussao ? 1 : 0;
  if (body && "is_coro" in body) patch.is_coro = body.is_coro ? 1 : 0;
  if (body && "is_violao" in body) patch.is_violao = body.is_violao ? 1 : 0;
  if (body && "is_acapella" in body) patch.is_acapella = body.is_acapella ? 1 : 0;
  if (STATUS.includes(body?.status)) patch.status = body.status;
  if (body && "letra" in body) patch.letra = body.letra ?? null;
  if (body && "chordpro" in body) patch.chordpro = body.chordpro ?? null;
  if (body && "tom_padrao" in body)
    patch.tom_padrao = body.tom_padrao?.trim() || null;
  if (body && "observacoes" in body) patch.observacoes = body.observacoes ?? null;
  if (body && "cantor_habitual_id" in body) {
    const n = Number(body.cantor_habitual_id);
    patch.cantor_habitual_id =
      body.cantor_habitual_id != null &&
      body.cantor_habitual_id !== "" &&
      Number.isFinite(n)
        ? n
        : null;
  }
  if (Array.isArray(body?.temas)) {
    patch.temas = body.temas.map(Number).filter((n: number) => Number.isFinite(n));
  }

  const musica = await updateMusica(Number(id), patch);
  if (!musica) {
    return NextResponse.json({ error: "Música não encontrada." }, { status: 404 });
  }
  return NextResponse.json(musica);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await removeMusica(Number(id));
  return NextResponse.json({ ok: true });
}
