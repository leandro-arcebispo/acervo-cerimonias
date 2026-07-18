# Acervo de Cerimônias

Sistema de acervo de músicas, temas, cerimônias e integrantes de um grupo de
cerimônias musicais. A feature principal é **montar cerimônias** a partir do
repertório e gerar a **folha impressa/PDF**; também importa cerimônias antigas
a partir de arquivos `.docx`.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript
- **Banco:** [libSQL/Turso](https://turso.tech) (SQLite-compatível) — em produção;
  arquivo local em dev
- **CSS puro** (sem Tailwind)
- **Porta (dev):** 6008

## Rodar localmente

Sem nenhuma conta na nuvem: sem as variáveis de ambiente, o app usa um arquivo
SQLite local (`data/acervo.db`), com schema e seed criados automaticamente no
primeiro acesso.

```bash
npm install
npm run dev          # http://localhost:6008
```

Para simular produção localmente: `npm run build && npm run start`.

Reseed/checagem do banco: `npm run db:init`. Testar o parser de import de
`.docx`: `npx tsx scripts/test-parse.ts`.

## Variáveis de ambiente

Copie [`.env.example`](.env.example) para `.env.local`. Todas são **opcionais
em dev** (há fallback local) e **necessárias em produção**:

| Variável | Para quê |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco Turso (`libsql://...`). Sem ela → `file:./data/acervo.db`. |
| `TURSO_AUTH_TOKEN` | Token de acesso ao Turso. |
| `BASIC_AUTH_PASSWORD` | Senha da trava de acesso (HTTP Basic Auth). Sem ela, a trava fica **desligada**. |
| `BASIC_AUTH_USER` | Usuário do login (opcional, default `grupo`). |

## Deploy no Vercel

O app foi arquitetado para o Vercel (serverless): banco remoto (Turso), sem
escrever em disco.

1. **Banco Turso** — via [turso.tech](https://turso.tech) (CLI ou dashboard):
   ```bash
   turso auth login
   turso db create acervo-cerimonias
   turso db show acervo-cerimonias --url    # → TURSO_DATABASE_URL
   turso db tokens create acervo-cerimonias # → TURSO_AUTH_TOKEN
   ```
   Não precisa criar tabelas — o schema é criado no primeiro acesso
   (`CREATE TABLE IF NOT EXISTS` + seed idempotente). O banco sobe vazio.

2. **Importar o repo** em [vercel.com/new](https://vercel.com/new) (Next.js é
   detectado automaticamente).

3. **Env vars** em *Settings → Environment Variables*: `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, `BASIC_AUTH_PASSWORD` (e `BASIC_AUTH_USER` se quiser).

4. **Deploy** (ou Redeploy, se já tinha buildado antes de setar as vars).

> ⚠️ Sem `TURSO_DATABASE_URL` em produção, o app cai no fallback de arquivo
> local e quebra (filesystem read-only do Vercel). Configure as env vars
> **antes** do deploy.

## Trava de acesso

`middleware.ts` protege todas as páginas e rotas de API com HTTP Basic Auth
quando `BASIC_AUTH_PASSWORD` está definido. Em dev (sem a variável) fica
liberado.

## Arquitetura (mapa rápido)

```
app/                  rotas (App Router) — páginas (server components async) + api/**
components/           SiteHeader, MusicaForm, MontarCerimonia, FolhaToolbar, ...
lib/
  db.ts               conexão libSQL (async) + helpers all/get/run + schema + seed +
                       migrarColunas() (ALTER TABLE idempotente, sem migrations formais)
  musicas.ts, temas.ts, integrantes.ts, cerimonias.ts, montagem.ts
  import-parser.ts, import-service.ts   extrai/importa cerimônias de .docx
scripts/               init-db.ts, test-parse.ts
public/docs/           amostras de .docx do grupo (usadas pelo import)
data/                  banco SQLite local (dev) — não versionado
```

## Documentação

- [`HANDOFF.md`](HANDOFF.md) — **leia primeiro ao retomar o projeto**: estado
  atual, decisões tomadas, armadilhas técnicas conhecidas.
- [`PLANEJAMENTO.md`](PLANEJAMENTO.md) · [`PLANO.md`](PLANO.md) ·
  [`SEED.md`](SEED.md)
