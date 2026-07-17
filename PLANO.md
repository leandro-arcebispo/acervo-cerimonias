# Plano de Desenvolvimento — Acervo de Cerimônias Musicais

Documento derivado de `PLANEJAMENTO.md` após a rodada de planejamento. Base para começar
o desenvolvimento. Ainda pode ser ajustado, mas as decisões abaixo estão travadas.

## 1. Decisões fechadas

| Tópico | Decisão |
|---|---|
| Hospedagem | Deploy pro grupo, padrão `sad-notes`: Next.js (App Router) + libSQL/Turso + Vercel Blob |
| Porta local | **6008** |
| Pasta | `C:\Workspace\acervo-cerimonias` |
| ORM / DB | Drizzle + libSQL (arquivo local em dev, Turso em produção) |
| **Ordem de construção** | **Import antes** — semear o acervo com os `.docx` reais antes de Montar Cerimônia |
| **Áudio no MVP** | **Fora do MVP** — entra na Fase 6 (Drive link → depois transcode) |
| **Autenticação** | **Senha única compartilhada** |
| **Exportação (1ª versão)** | **HTML otimizado p/ impressão** (Ctrl+P → PDF) |
| Layout de exportação | Feito do zero, sem replicar o Word atual |
| Cifra dedicada / variante instrumentista | Fase 5 ("upgrade") |
| Ajuste manual no acervo | Aceitável (tema/tom faltantes preenchidos à mão) |

## 2. Modelo de dados

### Entidades principais

- **Música:** `nome`, `nome_normalizado` (dedup), `autor_compositor`, `is_percussao`,
  `status` (`inédita`|`consolidada`|`aposentada`), `letra`, `chordpro` (Fase 5),
  `cantor_habitual_id` (opcional; senão derivado), `observacoes`.
- **Tema:** `nome`, `descricao`.
- **Integrante:** `nome`, `ativo` (+ instrumentos por junção).
- **Local:** `nome` (default "Casa de Cura").
- **Cerimônia:** `nome` (opcional), `data`, `local_id`, `observacoes`.

### Junções ricas (coração do sistema)

- **`item_cerimonia`** — sequência ordenada, unifica músicas e pausas (resolve a
  renumeração automática e a posição do despacho):
  - `cerimonia_id`, `ordem`, `tipo` ∈ {`musica`, `despacho`}, `momento_id` (opcional).
  - Se `musica`: `musica_id`, `tom`, `capotraste`, `cantor_id`, `numero` (auto),
    `cifra_snapshot` (opcional), `marcador` (`ponto`/`bis`/`defumação`…).
  - Se `despacho`: apenas o marcador da pausa ("2º Despacho").
  - `numero` é **calculado** contando só itens `tipo=musica` fora do pool.
- **`pool_despacho`** — músicas soltas sem numeração p/ escolha na hora: `cerimonia_id`,
  `musica_id`, `tom`, `ordem_sugerida`.
- **`musica_tema`** (N:N), **`cerimonia_tema`** (N:N, híbridas), **`momento_tema`**,
  **`cerimonia_integrante`** (quem participou + instrumento naquela cerimônia),
  **`integrante_instrumento`**, **`maestria_voz`** (integrante ↔ música, só voz).

### Campos derivados (calculados, não digitados)

- **Tons já tocados** = distinct `tom` em `item_cerimonia` + `musica_tom` (tons manuais).
- **Cantor habitual** = `cantor_id` mais frequente (com override manual).
- **Já foi de despacho?** = aparece em `pool_despacho`/item marcado.
- **Históricos** (integrante↔cerimônia, música↔cerimônia) = queries sobre as junções.

### Import & versão

- **`import_lote` / `import_item`** — staging do parser (JSON extraído, `match_musica_id`
  sugerido, flag `resolvido`); a tela de revisão opera aqui.
- **`musica_versao`** — snapshot de letra/chordpro a cada edição.
- **`audio`** (Fase 6) — vinculável a cerimônia/item/música; `tipo` (`drive_link`|`upload`),
  `url_ou_blob`, `formato`.

### Instrumentos (enum)
Voz, violão, violoncelo, percussão, teclado, guitarra, baixo, violino.

## 3. Stack & arquitetura

- **Next.js (App Router) + TypeScript** — Server Components + Server Actions no CRUD.
- **Drizzle ORM + libSQL/Turso**.
- **Busca na letra** — FTS5 do SQLite/libSQL (nativo).
- **Import `.docx`** — parser Node lendo `word/document.xml` + heurística + staging.
- **Export** — página HTML com CSS de impressão (`@media print`).
- **Auth** — senha única (cookie de sessão simples / middleware).
- **Vercel Blob** — só na Fase 6 (áudio).

## 4. Estratégia de mídia/custo (Fase 6)

WAVs ~50MB não escalam no Blob. Camadas:
1. Guardar **só o link do Drive** (custo ≈ zero).
2. Depois, upload com **transcodificação p/ Opus/MP3** (~2–4MB) só p/ preview; master WAV
   permanece no Drive.

## 5. Plano faseado (ordem confirmada)

| Fase | Entrega |
|---|---|
| **0 — Fundação** | Next.js + Turso + Drizzle, auth por senha única, deploy, seed de temas/integrantes/locais |
| **1 — Acervo (CRUD)** | Músicas (letra, temas, status, percussão), Temas, Integrantes, Locais + busca na letra |
| **2 — Import p/ semear** | Parser dos `.docx` + tela de staging/dedup → popula o acervo com os 6 arquivos reais |
| **3 — Montar Cerimônia** ⭐ | Builder guiado (a feature principal) |
| **4 — Geração de arquivo** | Folha da cerimônia p/ impressão (variante letra), HTML print |
| **5 — Cifra & transposição** | ChordPro como fonte única + transposição pro tom + variante instrumentista |
| **6 — Extras** | Áudio (Drive→transcode), histórico de versões, estatísticas, Modo Ao Vivo (PWA offline) |

## 6. Detalhamento — Fase 3: Montar Cerimônia (a FEATURE)

Fluxo guiado, replicando o processo manual de hoje, porém automatizado:

1. **Cabeçalho:** nome (opcional), data, local, tema(s). Suporta múltiplos temas/momentos.
2. **Montagem por momentos:** opcionalmente dividir em PARTES/momentos, cada um com
   tema(s). Em cada momento, adicionar músicas do acervo.
3. **Sugestões inteligentes** ao adicionar:
   - filtra por tema do momento;
   - ordena por **recência/rotação** (evita repetir músicas das últimas N cerimônias);
   - mostra **tons mais praticados** e **quem mais cantou** (pré-preenche tom e cantor);
   - sinaliza músicas cujo cantor habitual **não está** na formação selecionada.
4. **Por música na cerimônia:** setar `tom` (único), `cantor`, `capotraste`, marcadores.
5. **Despachos:** inserir marcadores de pausa na posição desejada; montar o **pool de
   despacho** (músicas soltas, sem número) com sugestões.
6. **Numeração automática** — nunca manual; recalcula ao reordenar (drag-and-drop).
7. **Salvar** → vira uma Cerimônia no acervo, pronta pra exportar (Fase 4).

## 7. Detalhamento — Fase 2: Import de `.docx`

Baseado na análise das 6 amostras (ver `PLANEJAMENTO.md` › "Análise das amostras").

- **Parser heurístico:** quebra por PARTE/DESPACHO; detecta numeração multi-formato
  (`1.`, `1 –`, `1 -`, `1)`); associa a linha em parênteses seguinte ao
  intérprete/instrumento; capta tom/capo/marcadores (`PONTO`, `BIS`, percussão, `*`).
- **Heterogeneidade:** aceitar arquivos só-acordes, só-letra, ou letra+acordes.
- **Tela de staging/revisão** (obrigatória antes de gravar):
  - resolver **dedup por grafia** (`SARASVATI` × `SARASVATĪ`; nomes repetidos `nº1/nº2`);
  - confirmar **tema** quando não explícito (inferir do nome do arquivo/rótulo de PARTE);
  - preencher **tom faltante**; marcar percussão/ponto/despacho.
- Gravar **tom no nível do item** (não global) e alimentar o histórico de tons.
- Guardar **texto bruto de acordes** + campo de tom normalizado editável.

## 8. Próximos passos imediatos

1. Fase 0: inicializar o projeto (Next.js + Drizzle + libSQL), schema base e auth por senha.
2. Definir a lista real de **temas** e **integrantes** para o seed (a partir das amostras +
   sua confirmação).
3. Começar a Fase 1 (CRUD do acervo).

> Observação: começaremos a codar só quando você der o ok para a Fase 0.
