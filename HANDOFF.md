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
- **CSS puro** (`app/globals.css`), SEM Tailwind. `jszip` p/ ler `.docx`. Uma fonte via
  `next/font/google` (Zilla Slab, ver seção de design).
- Porta **6008**. Rodar dev: `npm run dev` (ou via o launch.json do workspace, nome
  `acervo`, em `C:\Workspace\.claude\launch.json` — também existe um `.claude/launch.json`
  local no próprio projeto, equivalente). Reseed/checagem: `npm run db:init`.
  Testar o parser de import: `npx tsx scripts/test-parse.ts`.
- **Auth**: `middleware.ts` faz HTTP Basic Auth, só ativa se `BASIC_AUTH_PASSWORD`
  estiver setado (dev fica liberado). Senha única compartilhada.
- Padrão espelhado do projeto `C:\Workspace\sad-notes` (mesma stack).
- **Git/deploy**: repo no GitHub — `github.com/leandro-arcebispo/acervo-cerimonias`,
  branch `main` (renomeada de `master` pra bater com o default do remote), já com push
  feito e tudo sincronizado (`git status` limpo, exceto 2 PDFs soltos — ver "Estado atual
  dos dados"). `README.md` tem o passo a passo de deploy no Vercel + Turso.
  - **Banco Turso já existe e já foi populado**: `acervo-cerimonias-leandro-arcebispo`
    (`libsql://acervo-cerimonias-leandro-arcebispo.aws-us-east-1.turso.io`). O primeiro
    acesso do app rodou o `init()` e semeou os dados de fábrica; depois disso rodei
    `scripts/sync-to-turso.ts` (ver abaixo) com um token temporário que o usuário gerou só
    pra essa sincronização (validade de 1 dia, não guardado em lugar nenhum) — copiou as
    193 músicas/10 cerimônias/13 integrantes reais do `data/acervo.db` local pro remoto.
    **Local e remoto NÃO ficam sincronizados automaticamente** — são bancos independentes
    a partir de agora; se o usuário continuar editando local, precisa rodar o script de
    novo (com um token novo) pra levar as mudanças pro Turso.
  - **Vercel**: repo pronto pra importar, mas o deploy em si (import do projeto na Vercel +
    configurar env vars lá) **ainda não foi feito** nesta sessão — só o banco e o GitHub.
  - `.env.example` documenta as 4 vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
    `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`). Não há `.env.local` neste ambiente — dev
    local roda 100% no arquivo SQLite.
- **Cuidado ao rodar `next build`** nesta pasta enquanto o `npm run dev` estiver ativo
  (seu ou de outra sessão): os dois escrevem no mesmo `.next/` e o build de produção
  corrompe o cache do dev server (erro 500 "webpack_modules is not a function"). Se
  acontecer, só reiniciar o `npm run dev`. Prefira validar com `npx tsc --noEmit`.
  - **Já aconteceu nesta sessão**: subi um 2º `next dev` (porta 6009) pra testar uma
    migração de schema enquanto a sessão de outra janela tinha o da porta 6008 ativo —
    corrompeu o `.next/` e deu `ChunkLoadError` na porta 6008. Resolvido matando o processo
    da 6008 e rodando `npm run dev` de novo. **Evitar 2º dev server na mesma pasta.**

## Estrutura (arquivos-chave)

```
app/
  layout.tsx            shell (SiteHeader + main) + next/font/google (Zilla Slab, --font-tom)
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
  SiteHeader.tsx (client, nav, logo = SVG de flor outline vintage, sem subtítulo fixo),
  TemasManager, IntegrantesManager, MusicaForm (Salvar/Cancelar voltam pra onde a
  pessoa veio, ver Convenções), ImportStaging, MontarCerimonia (cria E edita, via props
  cerimoniaId/initial), FolhaToolbar (client: voltar/editar/fonte/toggle P&B/imprimir,
  envolve o conteúdo da folha e controla --folha-scale), VoltarButton (client, router.back()
  com fallback — usado na página de edição de música)
lib/
  db.ts            cliente libSQL + helpers all/get/run + nowIso + SCHEMA + seed +
                    migrarColunas() (ALTER TABLE idempotente p/ colunas novas, já
                    que não há migrations formais)
  seed-data.ts     instrumentos/temas/locais/integrantes do seed
  text.ts          normalizar() (dedup/busca acento-insensível)
  types.ts         tipos das entidades
  musicas.ts, temas.ts, integrantes.ts, montagem.ts
  cerimonias.ts    criarCerimonia/atualizarCerimonia (via salvarConteudo compartilhado),
                   getCerimoniaCompleta (p/ folha, inclui musicaId nos itens/índice p/ o
                   atalho de edição), getCerimoniaParaEditar (p/ builder), removeCerimonia
  import-parser.ts extrai+parseia .docx  |  import-service.ts preview+commit
scripts/ init-db.ts, test-parse.ts, sync-to-turso.ts (copia local → Turso, ver acima)
public/docs/         7 .docx de amostra do grupo (+ 2 PDFs soltos não versionados, ver
                     "Estado atual dos dados")
```

## Convenções (IMPORTANTE seguir)

- **Sem Server Actions.** Escrita = camada `lib/<entidade>.ts` (usa `all/get/run/nowIso`
  de `lib/db.ts`) + rotas `app/api/<entidade>/route.ts` (GET/POST) e `.../[id]/route.ts`
  (PATCH/PUT/DELETE). Componentes cliente `*Manager`/`*Form` dão `fetch` e chamam
  `router.refresh()` após mutação (senão a contagem server no page-head fica stale).
- **Navegação "voltar pra onde veio"**: em telas que podem ser abertas de mais de um lugar
  (ex.: editar música, acessível tanto de `/musicas` quanto do atalho na folha da
  cerimônia), usar `router.back()` (com fallback pra uma rota fixa se não houver
  histórico) em vez de um `href`/`router.push` fixo. Ver `VoltarButton.tsx` e o
  `voltarOuLista()` do `MusicaForm.tsx` (Salvar/Cancelar; só ao editar, criar sempre cai
  na listagem).
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
  - **Badge de tom** (`.tom`) usa fonte própria **Zilla Slab 500** (`--font-tom`, via
    `next/font/google` em `app/layout.tsx`, self-hosted no build — sem chamada externa em
    runtime), fallback `--sans`. Escolhida entre 5 opções comparadas visualmente
    (Special Elite, Courier Prime, Zilla Slab, EB Garamond, Vollkorn) — critério era
    legibilidade no tamanho minúsculo do badge (~36px) acima de qualquer floreio.
  - **Badge de percussão**: música com tag "Só percussão" (= sem instrumento harmônico)
    ganha um ícone de atabaque (SVG outline, `stroke="currentColor"`, herda a paleta) antes
    do quadrado de tom, mesmo tamanho (`.percussao-icone`, box model idêntico ao `.tom`:
    `height: 1.9em`, `min-width: 36px`). Tags Coro/Violão/Acapella ficam coladas ao lado do
    tom (`.tom-cluster`), todas numa linha só — não mais dentro do nome da música.
  - **Logo do header**: SVG outline de flor de 5 pétalas (vintage/botânico), cor
    `var(--accent)`. Sem subtítulo "Casa de Cura" fixo (removido).
- **Folha/print** (`globals.css`, seção "Folha da cerimônia"): usa `--folha-scale`
  (controlado pelo seletor de fonte no `FolhaToolbar`, **default agora é "Muito grande"**
  = `1.3`) multiplicando `calc()` em todo font-size da folha. Gotchas de impressão já
  resolvidos, não regredir:
  - Chrome **não imprime background/cor por padrão** — precisa de
    `print-color-adjust: exact` (já setado globalmente em `@media print`).
  - Cantos arredondados (`border-radius`) com `background` deixam uma **costura branca**
    no PDF (artefato do motor de impressão) — por isso `.tag`, `.tom`, `.percussao-icone`,
    `.despacho-item` ficam com `border-radius: 0` só em `@media print`.
  - **Nunca aplicar quebra de página forçada (`break-after`/`break-before: page`)
    diretamente num elemento que tem uma lista em colunas (`column-count`) como filho
    direto** — o motor de paginação do Chrome bugava (sumiam os `column-rule`, texto
    saía diferente). Solução: usar um `<div>` vazio dedicado só pra quebra
    (`.folha-quebra-indice`), separado do container colunado.
  - Cabeçalho/rodapé (nº de página, data, URL) na impressão é do **navegador**, não da
    página — não dá pra remover via CSS; o usuário desmarca "Cabeçalhos e rodapés" em
    "Mais definições" no diálogo de impressão.
  - **`.folha` tinha `padding: 0` no `@media print`** → texto sem caixa própria (ex.: o
    índice) ficava colado na borda da página. Corrigido pra `padding: 0.4rem 0.5rem`
    (pequeno, mas não-zero) — soma com a margem física da página (`@page { margin: 10mm
    8mm; }`). Não zerar de novo.
  - **Versão de impressão preto e branco**: toggle no `FolhaToolbar` aplica a classe
    `.folha-pb` na folha, que redefine localmente os tokens de cor (`--surface, --ink,
    --muted, --accent*, --line*, --badge-*, --tag-*`) pra tons de cinza/preto — mesmo
    layout, só cor. A versão colorida (`.folha` sem a classe) fica intocada.

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
- **item_cantores**: `item_id, integrante_id` — uma música de um item pode ter
  **múltiplos cantores** (chips clicáveis no builder). `itens_cerimonia.cantor_id` foi
  mantido só como fallback de leitura pra itens antigos que não têm linha aqui.
- **pool_despacho**: músicas soltas sem numeração (também exibem letra na folha agora).
- **audios** (Fase 6, ainda não usado), **import_lotes/import_itens** (definidas, o import
  atual não usa staging persistido — faz preview em memória).

## Status por fase

- **Fase 0 — Fundação**: ✅ projeto, schema, seed, auth, deploy-ready, **git com remote no
  GitHub e Turso já criado/populado** (ver "Stack & como rodar").
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
- **Fase 4 — Gerar folha/PDF**: ✅ e com vários refinamentos depois da versão inicial:
  cabeçalho, **índice** (nome + número, ordem numérica, 2 colunas, primeira página isolada
  no print, **nome agora é link pra editar a música**), momentos/despachos numerados,
  músicas com **letra completa** (também no pool), badges de tag reformulados (percussão =
  ícone de atabaque, coro/violão/acapella colados ao tom, fonte Zilla Slab no tom), nome da
  música na lista principal **também linka pra editar**, layout em **2 colunas** com
  margem de impressão pequena mas não-zero, **toggle de versão preto e branco**, fonte
  default "Muito grande". `FolhaToolbar` dá: Voltar, Editar (leva pro builder
  pré-preenchido), seletor de tamanho de fonte, toggle P&B, Imprimir/PDF (`window.print()`).
  Ver gotchas de print acima — já resolvidos, não regredir.
- **Fase 5 — Cifra/ChordPro + transposição**: ✅ implementado e testado ao vivo nesta
  sessão (dev server porta 6008). `musicas.chordpro` gravável via `MusicaForm` (textarea
  "Cifra (ChordPro)", separado da Letra); `lib/chordpro.ts` faz parse (`parseChordPro`,
  linha por linha, `[Acorde]texto` ou linha só-de-acordes) e transposição
  (`transposeChord`/`transposeLines`/`semitonesEntre`, semitons entre `tom_padrao` e o
  `tom` do item, escolhendo grafia sustenido/bemol pelo tom de destino);
  `components/Cifra.tsx` renderiza acorde-em-cima-da-sílaba; toggle "Ver cifra (acordes)"
  no `FolhaToolbar` (mesmo mecanismo do toggle P&B — os dois blocos sempre existem no DOM,
  CSS decide qual mostra, ver `.folha-so-letra`/`.folha-so-cifra` em `globals.css`);
  número de colunas é um toggle independente ("Colunas": 1/2 no `FolhaToolbar`, default
  **2** pra não alterar o visual já homologado de Letra) — não é mais amarrado ao modo
  Cifra, ver `.folha-lista { column-count: var(--folha-colunas, 2) }`;
  música sem `chordpro` cai pra letra normal + aviso inline "(sem cifra cadastrada)"
  quando o modo Cifra está ativo. Linhas sem nenhum acorde renderizam como texto corrido
  normal (sem a estrutura de chunk), evitando overflow de chunks muito longos.
  **Limitação conhecida, aceita por ora**: numa linha mista (acorde + letra), um trecho
  de texto muito longo entre dois acordes vira um único bloco que não quebra internamente
  — pode estourar a largura da coluna em casos raros (verso longo sem acorde no meio).
  Não migramos as 193 músicas existentes (decisão consciente, ver abaixo) — `chordpro`
  fica vazio até edição manual.
- **Fase 6 — Áudio (Drive/transcode) + PWA offline**: ⬜.

## Estado atual dos dados

- Seed: 8 instrumentos, 22 temas, 1 local (Casa de Cura), integrantes (o usuário editou
  via CRUD — ex.: Stéfanie, Vini, Ju Gomes, Leandro). Confirmar via app, não pelo SEED.md.
- **"La Llorona" (música id 135, da cerimônia CIGANA) já tem `chordpro` real preenchido** —
  primeira música com cifra de verdade no acervo, convertida nesta sessão a partir de uma
  cifra CifraClub que o usuário colou (formato acorde-em-cima-da-letra), com
  `tom_padrao: "Dm"`. Ver "Fase 5 — ajustes seguintes" acima pros detalhes da conversão.
- Importadas: Roda de Caboclo, Sete Linhas, Medicinas Sagradas, Cigana, Feminino em Nós,
  Oriental. **Atenção:** há registros de teste na lista de cerimônias
  (`_TEST_Cerimonia1`/afins, ids ~10-11) criados durante sessões de teste do usuário — uma
  delas já apareceu renomeada pra "Casa de vó" numa sessão paralela durante este handoff,
  confirmando que é só o próprio usuário testando, não bug. Confirmar com ele antes de
  apagar qualquer uma. Também ainda há possível duplicata de "Roda de Caboclo"
  (2 registros) — mesma cautela.
- **2 PDFs não versionados em `public/docs/`**: `Casa-de-vo-17-07-2026_cl.pdf` e
  `_pb.pdf` — parecem export de teste (provavelmente do toggle P&B novo) feitos numa
  sessão paralela. Não commitados ainda; `git status` mostra como untracked. Perguntar ao
  usuário se são pra manter (e onde — `public/docs/` é pras amostras de import, não pra
  isso) ou descartar, antes de tocar neles.
- **Turso**: banco de produção já existe e já tem uma cópia dos dados reais (sincronizada
  manualmente nesta sessão via `scripts/sync-to-turso.ts`) — ver "Stack & como rodar" pros
  detalhes e a ressalva de que local/remoto não ficam sincronizados automaticamente.
- **Atenção a múltiplas sessões simultâneas**: o usuário às vezes tem duas sessões de
  chat/terminal abertas apontando pro mesmo dev server (porta 6008). Isso já causou
  confusão (dados de cerimônia de teste mudando "sozinhos" entre turnos, `.next/` corrompido
  por um 2º dev server) — não é bug do código, é concorrência real de uso. Sempre que o
  estado parecer inesperado, considerar essa hipótese antes de procurar bug. **Não suba um
  2º `next dev` nesta pasta** — se precisar testar algo isolado, avise o usuário primeiro.

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
- **Índice + quebra de página no PDF real**: pendência antiga, ainda não confirmada
  visualmente pelo usuário num PDF real gerado depois do fix de isolamento da quebra —
  mas o ajuste de margem de impressão (ver Convenções) pode ter mudado o que ele via.
  Perguntar antes de considerar resolvido. Não há ferramenta de print-to-PDF disponível
  pra verificar isso a partir do assistente.
- **Deploy Vercel**: falta importar o repo no Vercel e configurar as env vars lá (o
  banco Turso e o GitHub já estão prontos, ver "Stack & como rodar" e o `README.md`).
- Os 2 PDFs soltos em `public/docs/` (ver "Estado atual dos dados") precisam de decisão.

## Fase 5: Cifra/ChordPro + transposição — ✅ implementada (sessão 2026-07-18)

Planejada e codada na mesma sessão (2026-07-18). `chordpro` NÃO substitui `letra` — os
dois campos coexistem, independentes; a folha ganha um toggle "Ver cifra (acordes)"
(mesmo padrão do toggle P&B já existente no `FolhaToolbar`). Decisões fechadas com o
usuário antes de codar:

- **Migração**: nenhuma migração em lote das 193 músicas existentes. `chordpro` fica
  opcional; enquanto vazio, o modo Cifra da folha cai pra letra normal (com aviso discreto
  "sem cifra cadastrada"). Preenchimento manual, música por música, começando pelas mais
  tocadas.
- **Formato de autoria**: ChordPro inline padrão, `[Am]Exu abre a [C]porta`. Precisa
  suportar também **linha só de acordes, sem letra nenhuma** (ex. `[Am] [C] [G] [Dm]`) —
  caso da progressão pura, sem texto — já que nem toda música precisa mostrar letra
  completa pro instrumentista, às vezes só a harmonia basta.
- **Tom de referência p/ transposição**: reaproveita `musicas.tom_padrao` (já existe,
  hoje é só fallback de tom em `montagem.ts`) como o tom em que o `chordpro` foi escrito.
  Ao trocar o `tom` do item na cerimônia, transpõe os acordes por semitons de diferença
  entre `tom_padrao` e o `tom` escolhido. **Risco conhecido**: `tom`/`tom_padrao` são
  campos de texto livre hoje (sem validação) — o parser de tom pro transpositor precisa
  tolerar entrada não reconhecida (fallback: mostrar cifra sem transpor + aviso, não
  quebrar a página).
- **Layout "com cifra"**: acorde alinhado em cima da sílaba (padrão ChordPro clássico),
  não inline entre colchetes na versão renderizada (colchetes são só a sintaxe de
  autoria). Decisão original desta sessão era forçar 1 coluna no modo Cifra (cifra ocupa
  mais altura por linha, não cabe bem em 2 colunas) — **substituída depois** por pedido do
  usuário: o número de colunas virou um toggle independente do Letra/Cifra (ver "Fase 5 —
  ajustes seguintes" abaixo), default 2 pra não alterar o visual já homologado.
- **Import**: parser (`import-parser.ts`) **não** tenta extrair cifra automaticamente dos
  `.docx` com acordes esparsos (ex. "La Llorona") — decisão consciente, mesmo padrão já
  usado pras tags Coro/Acapella. Cifra entra só via edição manual.

### O que foi implementado

1. `lib/musicas.ts`: `chordpro` em `MusicaInput`, `COLS`, INSERT de `createMusica` e
   `updateMusica` (era coluna órfã no schema — existia em `SCHEMA`, nunca lida/escrita).
   Rotas `app/api/musicas/route.ts` (POST) e `[id]/route.ts` (PATCH) também repassam
   `chordpro` do body.
2. `components/MusicaForm.tsx`: textarea "Cifra (ChordPro)", separado da Letra, com help
   text inline da sintaxe (`.form-help`/`.form-help code`, novo em `globals.css`).
3. `lib/chordpro.ts` (novo): `parseChordPro` (texto → `ChordProLine[]`, cada linha uma
   lista de `{chord, text}`; linha em branco vira separador de estrofe),
   `transposeChord`/`transposeLines` (desloca a tônica/baixo por N semitons, escolhe
   grafia sustenido/bemol pelo tom de destino via `preferFlatSpelling`), `parseTomRoot` +
   `semitonesEntre` (extrai a tônica de um texto livre de tom e calcula a diferença).
4. `components/Cifra.tsx` (novo): renderiza as `ChordProLine[]` já transpostas —
   acorde-em-cima-da-sílaba pra linhas com acorde (`.folha-cifra-chunk`), texto corrido
   normal pra linhas sem nenhum acorde (evita chunk atômico gigante que não quebraria
   linha), aviso se o tom não foi reconhecido pro transpositor.
5. `FolhaToolbar`: novo toggle "Ver cifra (acordes)" (mesmo mecanismo do toggle P&B —
   classe `folha-modo-cifra` em `.folha`).
6. `app/cerimonias/[id]/page.tsx`: componente local `LetraOuCifra` decide o que renderizar
   por item/pool — sempre renderiza os dois blocos (`.folha-so-letra`/`.folha-so-cifra`),
   CSS que mostra um ou outro conforme o toggle (igual ao `.folha-pb`, sem duplicar
   fetch). `lib/cerimonias.ts` passou a trazer `m.chordpro`/`m.tom_padrao AS tomPadrao`
   nas queries de `itens` e `pool` (`ItemCompleto`/`PoolItem`).
7. `globals.css`: classes `.folha-cifra-*`, `.folha-so-letra`/`.folha-so-cifra`,
   `.folha-cifra-aviso-inline`; `.folha.folha-modo-cifra .folha-lista { column-count: 1 }`
   (**substituído depois** por um toggle independente, ver ajuste mais abaixo).

Testado ao vivo no dev server (porta 6008): editei uma música real (DANÇA DO ESPÍRITO,
id 145) com cifra + `tom_padrao`, setei um tom diferente no item da cerimônia CIGANA
(id 7), conferi a transposição certa (ex. `Em7`→`Gm7` subindo 3 semitons) e o fallback
pra música sem cifra — depois **revertido** (`chordpro`/`tom_padrao` de volta a `null`,
tom do item de volta a vazio) pra não deixar dado fictício no acervo real.

**Ajuste seguinte na mesma sessão**: o usuário notou que a cifra bruta real do grupo
(arquivos importados) não segue o padrão "1 acorde = 1 colchete" — é comum um colchete só
com vários acordes (`[Em7 Am7 D Am7 B7 Em]`) ou nem colchete nenhum, só a linha de acordes
solta (`Am Dm Bdim E7 Am`). Pra não forçar reescrever tudo nessa sintaxe estrita,
`lib/chordpro.ts` agora aceita as 3 formas (1 acorde/colchete, vários acordes num colchete
só, ou linha inteira sem colchete detectada por heurística — reaproveita a mesma ideia de
`ehLinhaAcordes` do `import-parser.ts`, ≥60% dos tokens parecendo acorde) — todas viram
acordes individuais, cada um transponível. Linha detectada como "só progressão" (nenhum
chunk com texto de letra) ganha uma classe `.folha-cifra-linha-progressao` que dá um
espaçamento fixo entre acordes (em vez de depender de quantos espaços foram digitados) e
esconde a linha de sílaba fantasma. Testado ao vivo com "BESA ME MUCHO" (id 159, cifra
bruta `Am Dm Bdim E7 Am`, sem colchete nenhum) — transpôs certo e revertido depois.

**Ajuste seguinte (mesma sessão)**: usuário reportou que colchetes usados como separador
não apareciam no resultado — o colchete era sempre consumido/invisível (padrão ChordPro
de "acorde colado na sílaba"), o que apaga a moldura visual que ele usa pra separar
trechos de progressão. Corrigido em `lib/chordpro.ts`/`components/Cifra.tsx`: `ChordChunk`
ganhou `abreColchete`/`fechaColchete` marcando início/fim de cada colchete original; em
linha detectada como "só progressão" (nenhum acorde tem letra colada — checagem ignora
texto de pedaços sem acorde, tipo um rótulo "Intro: " antes do colchete, pra não falsear a
detecção) o colchete original é reproduzido no resultado, já transposto, ao redor de cada
grupo (`[Em7 Am7 D]` continua agrupado, mesmo transposto). Em linha com letra de verdade
o colchete continua invisível (padrão chordpro). Testado ao vivo de novo com DANÇA DO
ESPÍRITO (id 145), incluindo o caso de rótulo "Intro: [Em7] [Am7] ..." na mesma linha —
revertido depois.

**Ajuste seguinte (mesma sessão)**: usuário converteu uma cifra real (La Llorona, formato
CifraClub com acorde-em-cima-da-letra) pro nosso ChordPro — isso expôs que rótulo de seção
tipo `[Intro]`/`[Primeira Parte]` virava acorde fake (parser tratava qualquer colchete como
acorde). Corrigido: `CHORD_LIKE` ampliado pra aceitar extensão entre parênteses (ex.
`A7(9-)/D`), e cada colchete agora é checado individualmente (`pareceColcheteDeAcorde`) —
só vira acorde se TODO o conteúdo parecer acorde de verdade; senão fica como texto literal,
colchetes inclusos. Resultado salvo de verdade em "La Llorona" (id 135):
`chordpro` com a cifra convertida + `tom_padrao: "Dm"`.

**Ajuste seguinte (mesma sessão)**: usuário pediu que o número de colunas não fique preso
ao modo Cifra (era forçado 1 coluna) — quis um toggle independente que funcione pros dois
modos, **sem alterar o visual de Letra em 2 colunas já homologado**. Implementado:
`FolhaToolbar` ganhou o controle "Colunas" (select 1/2, default **2**, mesmo padrão do
"Fonte"), setando `--folha-colunas` inline junto com `--folha-scale`; `globals.css` mudou
`.folha-lista` pra `column-count: var(--folha-colunas, 2)` (fallback `2` = idêntico ao
valor fixo de antes) e a regra que forçava 1 coluna no modo Cifra foi removida. Testado ao
vivo: Letra no padrão continua 2 colunas; toggle "Colunas" muda em ambos os modos e
persiste ao trocar entre Letra/Cifra.
