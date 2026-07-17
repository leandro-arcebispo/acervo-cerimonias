import { NextResponse } from "next/server";
import { listMusicas, createMusica } from "@/lib/musicas";
import type { MusicaStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: MusicaStatus[] = ["inedita", "consolidada", "aposentada"];

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || undefined;
  return NextResponse.json(await listMusicas(q));
}

function parseTemas(v: unknown): number[] {
  return Array.isArray(v)
    ? v.map(Number).filter((n) => Number.isFinite(n))
    : [];
}

function parseCantor(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nome = String(body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  const status: MusicaStatus = STATUS.includes(body?.status)
    ? body.status
    : "consolidada";
  const musica = await createMusica({
    nome,
    autor_compositor: body?.autor_compositor?.trim() || null,
    is_percussao: body?.is_percussao ? 1 : 0,
    is_coro: body?.is_coro ? 1 : 0,
    is_violao: body?.is_violao ? 1 : 0,
    is_acapella: body?.is_acapella ? 1 : 0,
    status,
    letra: body?.letra ?? null,
    cantor_habitual_id: parseCantor(body?.cantor_habitual_id),
    tom_padrao: body?.tom_padrao?.trim() || null,
    observacoes: body?.observacoes ?? null,
    temas: parseTemas(body?.temas),
  });
  return NextResponse.json(musica, { status: 201 });
}
