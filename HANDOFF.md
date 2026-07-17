# HANDOFF — Acervo de Cerimônias

Estado do projeto para retomar em sessão nova. Sistema web de acervo de músicas,
temas, cerimônias e integrantes de um grupo de cerimônias musicais, cuja feature
principal é **montar cerimônias** a partir do repertório e gerar a **folha impressa/PDF**.

Docs de contexto: `PLANEJAMENTO.md` (visão + análise das amostras), `PLANO.md` (plano
faseado), `SEED.md` (dados do seed).

## Stack & como rodar

- **Next.js 15 (App Router) + TypeScript**, **React 19**.
- **libSQL** (`@libsql/client`) com **SQL cru** (SEM Drizzle). Dev = arquivo local
  `data/acervo.db`; produção = Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`).
- **CSS puro** (`app/globals.css`), SEM Tailwind. `jszip` p/ ler `.docx`.
- Porta **6008**. Rodar dev: `npm run dev` (ou via o launch.json do workspace, nome
  `acervo`, em `C:\Workspace\.claude\launch.json` — também existe um `.claude/launch.json`
  local no próprio projeto, equivalente). Reseed/checagem: `npm run db:init`.
  Testar o parser de import: `npx tsx scripts/test-parse.ts`.
- **Auth**: `middleware.ts` faz HTTP Basic Auth, só ativa se `BASIC_AUTH_PASSWORD`
  estiver setado (dev fica liberado). Senha única compartilhada.
- Padrão espelhado do projeto `C:\Workspace\sad-notes` (mesma stack).
- **Git**: repositório local inicializado (`git init` + commit inicial `cea9dfc`).
  `user.name`/`user.email` configurados só localmente neste repo (Leandro Arcebispo /
  leandro.arcebispo@proton.me). `.gitignore` já cobre `node_modules/`, `.next/`, `.env*`,
  `data/*.db*`. Ainda sem remote — é só versionamento local por enquanto.
- **Cuidado ao rodar `next build`** nesta pasta enquanto o `npm run dev` estiver ativo
  (seu ou de outra sessão): os dois escrevem no mesmo `.next/` e o build de produção
  corrompe o cache do dev server (erro 500 "webpack_modules is not a function"). Se
  acontecer, só reiniciar o `npm run dev`. Prefira validar com `npx tsc --noEmit`.

## Estrutura (arquivos-chave)

```
app/
  layout.tsx            shell (SiteHeader + main)
  globals.css           design system "hinário" (tokens + componentes + folha/print)
  page.tsx              home (visão geral)
  musicas/ page,nova,[id]   CRUD músicas + busca
  temas/ page           CRUD temas (TemasManager)
  integrantes/ page     CRUD integrantes (IntegrantesManager)
  cerimonias/ page          lista (linka pro detalhe) + botões Importar / Montar
  cerimonias/montar/        builder "Montar Cerimônia" (criar)
  cerimonias/[id]/          folha da cerimônia (detalhe + export/print) <- A FEATURE
  cerimonias/[id]/editar/   builder em modo edição (mesma tela do montar)
  import/ page,[arquivo]     import de .docx (lista + staging com exclusão de itens)
  api/
    musicas, temas, integrantes, instrumentos   (route.ts + [id])
    cerimonias        GET/POST (criar) ; [id] GET-via-lib/PUT (editar)/DELETE
    import/commit     POST commit do import
    montagem/sugestoes  GET sugestões p/ o builder
components/
  SiteHeader.tsx (client, nav), TemasManager, IntegrantesManager,
  MusicaForm, ImportStaging, MontarCerimonia (cria E edita, via props
  cerimoniaId/initial), FolhaToolbar (client: voltar/editar/fonte/imprimir,
  envolve o conteúdo da folha e controla --folha-scale)
lib/
  db.ts            cliente libSQL + helpers all/get/run + nowIso + SCHEMA + seed +
                    migrarColunas() (ALTER TABLE idempotente p/ colunas novas, já
                    que não há migrations formais)
  seed-data.ts     instrumentos/temas/locais/integrantes do seed
  text.ts          normalizar() (dedup/busca acento-insensível)
  types.ts         tipos das entidades
  musicas.ts, temas.ts, integrantes.ts, montagem.ts
  cerimonias.ts    criarCerimonia/atualizarCerimonia (via salvarConteudo compartilhado),
                   getCerimoniaCompleta (p/ folha), getCerimoniaParaEditar (p/ builder),
                   removeCerimonia
  import-parser.ts extrai+parseia .docx  |  import-service.ts preview+commit
scripts/ init-db.ts, test-parse.ts
public/docs/         7 .docx de amostra do grupo
```

## Convenções (IMPORTANTE seguir)

- **Sem Server Actions.** Escrita = camada `lib/<entidade>.ts` (usa `all/get/run/nowIso`
  de `lib/db.ts`) + rotas `app/api/<entidade>/route.ts` (GET/POST) e `.../[id]/route.ts`
  (PATCH/PUT/DELETE). Componentes cliente `*Manager`/`*Form` dão `fetch` e chamam
  `router.refresh()` após mutação (senão a contagem server no page-head fica stale).
- **libSQL named args**: SQL usa `@campo`, args é objeto `{ campo: valor }` (chaves sem @).
  `null` é válido. Ver exemplos em qualquer lib.
- **Next 15**: `params` e `searchParams` são `Promise` → `const { id } = await ctx.params`.
- **Schema**: criado com `CREATE TABLE IF NOT EXISTS` + seed idempotente na 1ª conexão
  (`init()` em `lib/db.ts`). Não há migrations de verdade; colunas novas em tabelas
  existentes vão em `migrarColunas()` (checa `PRAGMA table_info` e faz `ALTER TABLE
  ADD COLUMN` se faltar) — **sempre reiniciar o dev server depois de mexer no schema**,
  porque a conexão só roda o init/migração uma vez por processo.
- **Design "hinário / caderno sagrado"** (aprovado pelo usuário): papel quente, serifa nos
  títulos/nomes de música, sans no chrome, acento terracota. Tokens no `:root` do
  `globals.css` (`--bg, --surface, --ink, --accent, --accent-deep, --line, --badge-*,
  --serif, --sans`, etc.). Reusar classes: `.card .btn .btn-primary .chip .songlist
  .song-row .tom .tag .form .input .select .checks .check .empty .builder .panel`. Sem
  dark mode (look claro deliberado).
- **Folha/print** (`globals.css`, seção "Folha da cerimônia"): usa `--folha-scale`
  (controlado pelo seletor de fonte no `FolhaToolbar`) multiplicando `calc()` em todo
  font-size da folha. Gotchas de impressão já resolvidos, não regredir:
  - Chrome **não imprime background/cor por padrão** — precisa de
    `print-color-adjust: exact` (já setado globalmente em `@media print`).
  - Cantos arredondados (`border-radius`) com `background` deixam uma **costura branca**
    no PDF (artefato do motor de impressão) — por isso `.tag`, `.tom`, `.despacho-item`
    ficam com `border-radius: 0` só em `@media print`.
  - **Nunca aplicar quebra de página forçada (`break-after`/`break-before: page`)
    diretamente num elemento que tem uma lista em colunas (`column-count`) como filho
    direto** — o motor de paginação do Chrome bugava (sumiam os `column-rule`, texto
    saía diferente). Solução: usar um `<div>` vazio dedicado só pra quebra
    (`.folha-quebra-indice`), separado do container colunado.
  - Cabeçalho/rodapé (nº de página, data, URL) na impressão é do **navegador**, não da
    página — não dá pra remover via CSS; o usuário desmarca "Cabeçalhos e rodapés" em
    "Mais definições" no diálogo de impressão.

## Modelo de dados (SQLite, em `lib/db.ts`)

- **musicas**: nome, nome_normalizado, autor_compositor, status
  [inedita|consolidada|aposentada], letra, chordpro (ainda não usado), cantor_habitual_id,
  **tom_padrao** (fallback de tom quando não há histórico — ver `montagem.ts`), obs,
  timestamps. Tags booleanas: **is_percussao, is_coro, is_violao, is_acapella** (editadas
  como grupo "Tags" no `MusicaForm`).
- **temas**, **integrantes** (+ `integrante_instrumentos`), **instrumentos** (enum),
  **locais** (tabela legada, não usada mais pela cerimônia — ver abaixo).
- Junções: **musica_temas**, **musica_tons** (tons manuais — tabela existe mas **ainda não
  é lida/escrita em lugar nenhum**, ficou reservada), **maestria_voz**, **musica_versoes**.
- **cerimonias** (nome, data, **local** — texto livre, coluna adicionada via
  `migrarColunas()`; a antiga `local_id`/FK pra `locais` foi abandonada mas a coluna
  continua na tabela, sem uso, com backfill automático pro texto na 1ª migração) +
  **cerimonia_temas**, **cerimonia_integrantes**,
  **momentos** (+ **momento_temas** — só existem em cerimônias vindas do import; o
  builder monta lista plana e não os usa).
- **itens_cerimonia**: sequência ordenada. `tipo` = `musica` | `despacho` | **`quebra`**
  (marcador de quebra de página manual, inserido no builder, sem conteúdo). Músicas têm
  `musica_id, tom, capotraste, cantor_id (legado), numero` (numeração automática, só conta
  itens `tipo=musica`), `marcador` (despacho guarda texto tipo "1º Despacho", numerado
  automaticamente pela posição entre os despachos).
- **item_cantores** (NOVA): `item_id, integrante_id` — uma música de um item pode ter
  **múltiplos cantores** (chips clicáveis no builder). `itens_cerimonia.cantor_id` foi
  mantido só como fallback de leitura pra itens antigos que não têm linha aqui.
- **pool_despacho**: músicas soltas sem numeração (também exibem letra na folha agora).
- **audios** (Fase 6, ainda não usado), **import_lotes/import_itens** (definidas, o import
  atual não usa staging persistido — faz preview em memória).

## Status por fase

- **Fase 0 — Fundação**: ✅ projeto, schema, seed, auth, deploy-ready, git local.
- **Fase 1 — CRUD do acervo**: ✅ Músicas (busca na letra via `?q`, tags, tom_padrao),
  Temas, Integrantes. Locais: resolvido virando campo de texto livre na cerimônia (ver
  modelo de dados) em vez de CRUD/FK dedicado.
- **Fase 2 — Import .docx**: ✅ parser (`import-parser.ts`, validado nos 7 arquivos) +
  staging (`/import/[arquivo]`, `ImportStaging` — agora com checkbox de excluir item antes
  de importar, pré-desmarcado pra entradas sem nome) + commit (`import-service.ts`) que
  cria músicas (dedup por nome_normalizado), cerimônia, temas, integrantes, momentos,
  itens, pool. Correções recentes no parser: número em branco não "engole" mais o próximo
  item numerado real; tom no fim sem traço (ex. "REZA REZADOR Gm") é detectado quando tem
  qualificador (m/7/dim...). Aliases de tema: PG→Pomba Gira, Caboclos→Roda de Caboclo.
- **Fase 3 — Montar Cerimônia**: ✅ `MontarCerimonia` usado tanto em `/cerimonias/montar`
  (criar) quanto `/cerimonias/[id]/editar` (editar, via props `cerimoniaId`+`initial`).
  `lib/montagem.ts` `sugestoesMusicas(temaIds)` retorna tom do histórico ou, se não houver,
  `tom_padrao` da música. Fluxo: temas → repertório sugerido → "+ música" (tom+cantores
  auto) / "+ pool" → reordenar/inserir despacho (numerado "1º Despacho"...) / inserir
  quebra de página → cantores por chips (multi-seleção) → numeração automática → salvar
  (POST cria / PUT `/api/cerimonias/[id]` edita, via `criarCerimonia`/`atualizarCerimonia`).
- **Fase 4 — Gerar folha/PDF**: ✅ `/cerimonias/[id]` mostra a folha completa: cabeçalho,
  **índice** (nome + número, ordem numérica, 2 colunas, primeira página isolada no print),
  momentos/despachos numerados, músicas com **letra completa** (também no pool), tags de
  música, cantor(es)+tom **numa linha abaixo do título** (preview e PDF iguais), layout em
  **2 colunas** com margens de impressão reduzidas (`@page`). `FolhaToolbar` dá: Voltar,
  Editar (leva pro builder pré-preenchido), seletor de **tamanho de fonte** (`--folha-scale`),
  Imprimir/PDF (`window.print()`). Ver gotchas de print acima — já resolvidos, não regredir.
- **Fase 5 — Cifra/ChordPro + transposição**: ⬜ PRÓXIMA.
- **Fase 6 — Áudio (Drive/transcode) + PWA offline**: ⬜.

## Estado atual dos dados

- Seed: 8 instrumentos, 22 temas, 1 local (Casa de Cura), integrantes (o usuário editou
  via CRUD — ex.: Stéfanie, Vini, Ju Gomes, Leandro). Confirmar via app, não pelo SEED.md.
- Importadas: Roda de Caboclo, Sete Linhas, Medicinas Sagradas, Cigana, Feminino em Nós,
  Oriental. **Atenção:** há registros de teste na lista de cerimônias
  (`_TEST_Cerimonia1`, `_TEST_Cerimonia2` e afins, ids ~10-11) criados durante sessões de
  teste do usuário — confirmar com ele antes de apagar. Também ainda há possível
  duplicata de "Roda de Caboclo" (2 registros) — mesma cautela.
- **Atenção a múltiplas sessões simultâneas**: o usuário às vezes tem duas sessões de
  chat/terminal abertas apontando pro mesmo dev server (porta 6008). Isso já causou
  confusão (dados de cerimônia de teste mudando "sozinhos" entre turnos) — não é bug do
  código, é concorrência real de uso. Sempre que o estado parecer inesperado, considerar
  essa hipótese antes de procurar bug.

## Pendências / refinamentos conhecidos

- Builder monta **lista plana + despachos + quebras**; não agrupa em "momentos"/PARTES
  (cerimônias híbridas tipo "Viver em Essência" vindas do import perdem essa estrutura se
  editadas pelo builder). Enhancement futuro.
- Import: músicas do **pool** herdam TODOS os temas da cerimônia (over-tag); música
  **reaproveitada** não acumula temas de outra cerimônia.
- Import parser não detecta as tags Coro/Acapella automaticamente do texto do `.docx`
  (ficam sempre desmarcadas até edição manual) — decisão consciente de não mexer no
  parser por ora.
- Upload de novos `.docx` não existe (import lê de `public/docs`).
- **Índice + quebra de página no PDF real**: o usuário reportou regressão visual (linhas
  divisórias sumindo, texto mais escuro) depois de inserir o índice; isolei a quebra de
  página num elemento próprio separado da lista em colunas (ver gotcha de print acima),
  mas **ainda não foi confirmado pelo usuário num PDF real gerado depois desse fix** — não
  há ferramenta de print-to-PDF disponível pra verificar isso a partir do assistente.
  Confirmar com ele antes de considerar resolvido.

## PRÓXIMO — Fase 5: Cifra/ChordPro + transposição

Fase 4 funcionalmente completa, mas com a pendência do índice/quebra de página acima
ainda não confirmada visualmente pelo usuário num PDF real — perguntar primeiro.

Fase 5 (futura): exibir/editar `chordpro` das músicas, transposição por tom na hora de
montar/imprimir a cerimônia (hoje `tom` é só texto livre por item).
