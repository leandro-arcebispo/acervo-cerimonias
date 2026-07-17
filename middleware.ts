import { NextResponse, type NextRequest } from "next/server";

/**
 * Trava de acesso simples (HTTP Basic Auth), senha única compartilhada pro grupo.
 * Protege TODAS as páginas e rotas de API quando o app fica exposto na internet.
 *
 * Só entra em ação quando `BASIC_AUTH_PASSWORD` está definido (ver .env.local).
 * Sem a variável — ex.: desenvolvimento local — libera tudo, pra não pedir senha
 * o tempo todo. Em produção, DEFINA a senha antes de expor o app.
 */

const REALM = 'Basic realm="Acervo de Cerimônias", charset="UTF-8"';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const expected = process.env.BASIC_AUTH_PASSWORD;
  // Sem senha configurada (dev) → libera.
  if (!expected) return NextResponse.next();

  const expectedUser = process.env.BASIC_AUTH_USER || "grupo";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (safeEqual(user, expectedUser) && safeEqual(pass, expected)) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export const config = {
  // Protege tudo, menos os assets internos do Next (não sensíveis).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
