import { NextResponse } from "next/server";
import { sugestoesMusicas } from "@/lib/montagem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const temasParam = new URL(req.url).searchParams.get("temas");
  const temaIds = temasParam
    ? temasParam.split(",").map(Number).filter((n) => Number.isFinite(n))
    : [];
  return NextResponse.json(await sugestoesMusicas(temaIds));
}
