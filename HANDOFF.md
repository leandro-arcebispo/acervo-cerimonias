# HANDOFF — Acervo de Cerimônias

Estado do projeto para retomar em sessão nova. Sistema web de acervo de músicas,
temas, cerimônias e integrantes de um grupo de cerimônias musicais, cuja feature
principal é **montar cerimônias** a partir do repertório.

Docs de contexto: `PLANEJAMENTO.md` (visão + análise das amostras), `PLANO.md` (plano
faseado), `SEED.md` (dados do seed).

## Stack & como rodar

- **Next.js 15 (App Router) + TypeScript**, **React 19**.
- **libSQL** (`@libsql/client`) com **SQL cru** (SEM Drizzle). Dev = arquivo local
  `data/acervo.db`; produção = Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`).
- **CSS puro** (`app/globals.css`), SEM Tailwind. `jszip` p/ ler `.docx`.
- Porta **6008**. Rodar dev: `npm run dev` (ou via o launch.json do workspace, nome
  `acervo`, em `C:\Workspace\.claude\launch.json`). Reseed/checagem: `npm run db:init`.
  Testar o parser de import: `npx tsx scripts/test-parse.ts`.
- **Auth**: `middleware.ts` faz HTTP Basic Auth, só ativa se `BASIC_AUTH_PASSWORD`
  estiver setado (dev fica liberado). Senha única compartilhada.
- Padrão espelhado do projeto `C:\Workspace\sad-notes` (mesma stack).

## Estrutura (arquivos-chave)

```
app/
  layout.tsx            shell (SiteHeader + main)
  globals.css           design system "hinário" (tokens + componentes)
  page.tsx              home (visão geral)
  musicas/ page,nova,[id]   CRUD músicas + busca
  temas/ page           CRUD temas (TemasManager)
  integrantes/ page     CRUD integrantes (IntegrantesManager)
  cerimonias/ page      lista + botões Importar / Montar
  cerimonias/montar/    builder "Montar Cerimônia"  <-- A FEATURE
  import/ page,[arquivo]     import de .docx (lista + staging)
  api/
    musicas, temas, integrantes, instrumentos, cerimonias   (route.ts + [id])
    import/commit        POST commit do import
    montagem/sugestoes   GET sugestões p/ o builder
components/
  SiteHeader.tsx (client, nav), TemasManager, IntegrantesManager,
  MusicaForm, ImportStaging, MontarCerimonia
lib/
  db.ts            cliente libSQL + helpers all/get/run + nowIso + SCHEMA + seed
  seed-data.ts     instrumentos/temas/locais/integrantes do seed
  text.ts          normalizar() (dedup/busca acento-insensível)
  types.ts         tipos das entidades
  musicas.ts, temas.ts, integrantes.ts, cerimonias.ts, montagem.ts
  import-parser.ts extrai+parseia .docx  |  import-service.ts preview+commit
scripts/ init-db.ts, test-parse.ts
public/docs/         6 .docx de amostra do grupo
```

## Convenções (IMPORTANTE seguir)

- **Sem Server Actions.** Escrita = camada `lib/<entidade>.ts` (usa `all/get/run/nowIso`
  de `lib/db.ts`) + rotas `app/api/<entidade>/route.ts` (GET/POST) e `.../[id]/route.ts`
  (PATCH/DELETE). Componentes cliente `*Manager`/`*Form` dão `fetch` e chamam
  `router.refresh()` após mutação (senão a contagem server no page-head fica stale).
- **libSQL named args**: SQL usa `@campo`, args é objeto `{ campo: valor }` (chaves sem @).
  `null` é válido. Ver exemplos em qualquer lib.
- **Next 15**: `params` e `searchParams` são `Promise` → `const { id } = await ctx.params`.
- **Schema**: criado com `CREATE TABLE IF NOT EXISTS` + seed idempotente na 1ª conexão
  (`init()` em `lib/db.ts`). Não há migrations; editar o SCHEMA e recriar se preciso.
- **Design "hinário / caderno sagrado"** (aprovado pelo usuário): papel quente, serifa nos
  títulos/nomes de música, sans no chrome, acento terracota. Tokens no `:root` do
  `globals.css` (`--bg, --surface, --ink, --accent, --accent-deep, --line, --badge-*,
  --serif, --sans`, etc.). Reusar classes: `.card .btn .btn-primary .chip .songlist
  .song-row .tom .tag .form .input .select .checks .check .empty .builder .panel`. Sem
  dark mode (look claro deliberado). Ajustes finos de layout: usuário fará depois.

## Modelo de dados (SQLite, em `lib/db.ts`)

- **musicas** (nome, nome_normalizado, autor_compositor, is_percussao, status
  [inedita|consolidada|aposentada], letra, chordpro, cantor_habitual_id, obs, timestamps).
- **temas**, **integrantes** (+ `integrante_instrumentos`), **instrumentos** (enum),
  **locais**.
- Junções: **musica_temas**, **musica_tons** (tons manuais), **maestria_voz**,
  **musica_versoes**.
- **cerimonias** (nome, data, local_id) + **cerimonia_temas**, **cerimonia_integrantes**,
  **momentos** (+ **momento_temas**).
- **itens_cerimonia**: sequência ordenada. `tipo` = `musica` | `despacho`. Músicas têm
  `musica_id, tom, capotraste, cantor_id, numero` (numeração automática, só conta itens
  `tipo=musica`), `marcador`. Despacho = marcador de pausa.
- **pool_despacho**: músicas soltas sem numeração.
- **audios** (Fase 6, ainda não usado), **import_lotes/import_itens** (definidas, o import
  atual não usa staging persistido — faz preview em memória).

## Status por fase

- **Fase 0 — Fundação**: ✅ projeto, schema, seed, auth, deploy-ready.
- **Fase 1 — CRUD do acervo**: ✅ Músicas (com busca na letra via `?q`), Temas,
  Integrantes. Locais: adiado (só "Casa de Cura"; tratar no fluxo de cerimônia).
- **Fase 2 — Import .docx**: ✅ parser (`import-parser.ts`, validado nos 6 arquivos) +
  staging (`/import/[arquivo]`, `ImportStaging`) + commit (`import-service.ts`) que cria
  músicas (dedup por nome_normalizado), cerimônia, temas, integrantes, momentos, itens,
  pool. Aliases de tema: PG→Pomba Gira, Caboclos→Roda de Caboclo. Toms saem só quando o
  arquivo usa tom único; progressões ficam p/ revisão. Pool over-split em letras longas
  (flagged nos avisos).
- **Fase 3 — Montar Cerimônia** (A FEATURE): ✅ `/cerimonias/montar` (`MontarCerimonia`).
  `lib/montagem.ts` `sugestoesMusicas(temaIds)` retorna músicas com vezesTocada, ultimaData,
  tomMaisUsado, cantorHabitual. Fluxo: temas → repertório sugerido → "+ música" (tom+cantor
  auto do histórico) / "+ pool" → reordenar/inserir despacho → numeração automática →
  salvar (`criarCerimonia` em `lib/cerimonias.ts`, POST `/api/cerimonias`).
- **Fase 4 — Gerar folha/PDF**: ✅ `/cerimonias/[id]` (`lib/cerimonias.ts`
  `getCerimoniaCompleta`) mostra a folha completa (cabeçalho, momentos, despachos,
  músicas numeradas com tom/cantor/capo, pool de despacho) com `@media print` +
  botão "Imprimir / PDF" (`PrintButton.tsx`, `window.print()`). Lista de cerimônias
  agora linka pro detalhe.
- **Fase 5 — Cifra/ChordPro + transposição**: ⬜ PRÓXIMA.
- **Fase 6 — Áudio (Drive/transcode) + PWA offline**: ⬜.

## Estado atual dos dados

- Seed: 8 instrumentos, 22 temas, 1 local (Casa de Cura), integrantes (o usuário editou
  via CRUD — ex.: Stéfanie, Vini). Confirmar via app, não pelo SEED.md.
- Importadas: Roda de Caboclo e Sete Linhas (~74 músicas). **Atenção:** há 2 registros
  "Roda de Caboclo" na lista de cerimônias — possível duplicata; confirmar com o usuário
  antes de apagar (pode ter sido criada por ele).

## Pendências / refinamentos conhecidos

- Builder monta **lista plana + despachos**; não agrupa em "momentos"/PARTES (cerimônias
  híbridas tipo "Viver em Essência"). Enhancement futuro.
- Import: músicas do **pool** herdam TODOS os temas da cerimônia (over-tag); música
  **reaproveitada** não acumula temas de outra cerimônia.
- Faltam 4 dos 6 arquivos a importar via `/import`.
- Upload de novos `.docx` não existe (import lê de `public/docs`).

## PRÓXIMO — Fase 5: Cifra/ChordPro + transposição

Fase 4 concluída (ver status acima). Usuário ainda não validou visualmente o layout da
folha (`/cerimonias/[id]`) nem imprimiu de fato — conferir com ele antes de dar por
encerrada. Possíveis ajustes finos de layout ficam a critério dele.

Fase 5 (futura): exibir/editar `chordpro` das músicas, transposição por tom na hora de
montar/imprimir a cerimônia (hoje `tom` é só texto livre por item).
