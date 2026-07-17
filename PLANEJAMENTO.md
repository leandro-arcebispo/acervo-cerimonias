# Prompt de Planejamento — Acervo de Cerimônias Musicais

Quero planejar (ainda **sem escrever código**) um sistema web para gerenciar o acervo
musical de um grupo que realiza cerimônias musicais. Vamos definir juntos: modelo de
dados, arquitetura, stack, estratégia de mídia/custo, e um plano de desenvolvimento
faseado. Faça perguntas quando algo estiver ambíguo e me proponha alternativas com
trade-offs.

## Contexto do domínio

Há anos participo de um grupo que faz **cerimônias musicais**. Cada cerimônia tem **um
ou mais temas**, e cada tema reúne diversas músicas. Uma mesma música pode aparecer em
vários temas. As cerimônias acontecem geralmente na **Casa de Cura**, mas às vezes em
outros locais.

Exemplos de temas: Sertão, Oriental, Pachamama, Roda de Caboclo, Pretos Velhos, Águas,
Onã, Cigana.

Nuances importantes do domínio:

- **Rotação de repertório:** cerimônias de um mesmo tema têm conjuntos de músicas
  diferentes. A gente repete várias, adiciona algumas novas, aposenta outras.
- **Cerimônias híbridas / "momentos":** uma cerimônia pode combinar vários temas. Ex.:
  a cerimônia "Viver em essência" (nome próprio, único, nunca repetido) teve 4 momentos,
  cada um com um conjunto de músicas de outros temas (Águas, Sertão, Oriental, Cigana).
- **Despachos:** cada cerimônia tem 3 ou 4 "Despachos" — momentos de pausa. Às vezes não
  se toca nada; às vezes se escolhe uma música; às vezes só um instrumental; às vezes se
  busca algo no celular na hora, olhando arquivos antigos. Por isso, hoje deixamos no fim
  do arquivo uma seção "Despacho" com músicas **sem numeração**, para escolher livremente
  na hora (depende da vibe e do tempo da pausa, que pode pedir mais músicas).
- **Tom por cerimônia:** uma música tem vários tons já registrados historicamente, mas
  **em uma cerimônia específica um único tom é definido** para ela.
- **Formação variável:** o grupo é relativamente fixo, mas há movimentação por
  disponibilidade e pelo tamanho da cerimônia (mais/menos vozes e instrumentos).

## Fluxo atual (o que queremos substituir/melhorar)

Hoje, para cada cerimônia criamos um arquivo Word manualmente:
- Numeramos as músicas em sequência e anotamos onde cada Despacho acontece.
- Partimos de arquivos de cerimônias antigas (mesmo tema, ou que continham aquele tema),
  copiamos músicas que ficaram boas, escrevemos músicas inéditas, anotamos os despachos,
  **renumeramos tudo** manualmente, e anotamos quem canta cada música e o tom.
- No fim, exportamos um **PDF** a partir do Word para imprimir e distribuir a todos.
- **Eu sou instrumentista** e mantenho um arquivo separado, semelhante, mas **com as
  cifras** das músicas. (Ponto importante: existem duas variantes do documento — letra
  simples e letra com cifra.)
- No Drive guardamos **áudios das cerimônias**, úteis para consultar tons antigos, ouvir
  arranjos de anos atrás e fazer autocrítica. Os áudios costumam ser **WAV grandes
  (~50MB cada)**.

## Objetivo

Um sistema web que sirva de **acervo** de músicas, temas, cerimônias e integrantes, e que
**auxilie na criação de novos arquivos** e funcione como base de conhecimento — reduzindo
o trabalho manual (cópia, renumeração, conferência de tom, etc.).

## Modelo de dados (requisitos)

**Música**
- Nome
- Compositor / autor / banda
- Tons já tocados (histórico, vários)
- Temas em que aparece (um ou mais)
- Letra
- Letra com cifra (variante)
- Integrante que geralmente canta
- É só percussão? (sim/não)
- Já foi música de despacho? (sim/não)
- Áudio gravado
- Histórico de versões (a letra/arranjo muda ao longo do tempo)

**Tema**
- Nome
- Músicas do tema
- Cerimônias que tiveram esse tema

**Cerimônia**
- Músicas — cada uma com **um tom definido** (dentre os tons registrados da música)
- Músicas de despacho — também com tom
- Ordem e numeração das músicas
- Tema(s) — um ou mais
- Integrantes participantes
- Data
- Local

**Integrante**
- Nome
- Instrumento(s): Voz, violão, violoncelo, percussão, teclado, guitarra, baixo, violino
- Histórico de cerimônias
- Músicas com mais maestria (apenas para voz)

## Features principais (requisitos)

1. **Montar cerimônia** — **ESTA É A FEATURE PRINCIPAL.** Uma tela onde eu seleciono um
   ou mais temas e um fluxo guiado me leva até o arquivo final, sem tarefa manual e sem
   precisar conferir numeração. A montagem puxa do acervo, **sugere músicas com base no
   tema**, mostra os **tons mais praticados** e **quem mais cantou** cada música para
   preencher os dados, e **sugere músicas de despacho**. É o fluxo manual de hoje, porém
   melhor.
2. **Importação para o acervo** — importar múltiplos arquivos existentes (mesma estrutura
   do Word) para cadastro automático de músicas. Tenho arquivos de exemplo para
   definirmos como o import funciona e o que dá para extrair.
3. **Geração de arquivo (PDF ou Word)** — a partir de uma cerimônia montada (ou já
   cadastrada), gerar o arquivo respeitando ordem, numeração, tons, integrantes, etc.
   Deve contemplar as **duas variantes**: letra simples e letra com cifra.

## Sugestões (a discutir e podar no planejamento)

Marque cada uma como "aceitar / depois / descartar":

- **Fonte única para letra + cifra (formato ChordPro):** armazenar a música UMA vez com
  cifras embutidas no formato ChordPro. As duas variantes (só letra / letra+cifra) são
  **geradas a partir da mesma fonte** — acaba a manutenção de dois documentos separados.
- **Transposição automática de tom:** como cada cerimônia define um tom, o sistema
  transpõe as cifras automaticamente para o tom escolhido. Ganho enorme para o
  instrumentista; elimina retrabalho manual de cifra.
- **Modo Ao Vivo / Palco (PWA offline):** além do PDF impresso, uma visão de celular/tablet
  durante a cerimônia — texto grande, música atual destacada, marcadores de despacho, e
  **acesso rápido ao "pool" de despacho** para escolher na hora. Resolve diretamente a dor
  de "buscar no celular olhando arquivos antigos". Como as cerimônias podem ser em locais
  sem internet (Casa de Cura), sugiro **PWA com funcionamento offline**.
- **Sugestão inteligente na montagem** considerando: frequência de uso, **recência**
  (rotação — evitar repetir músicas das últimas N cerimônias), aderência ao(s) tema(s), e
  **quem está presente** (só sugerir/mostrar músicas cujo cantor habitual esteja na
  formação daquela cerimônia, ou sinalizar as que ficam "sem cantor").
- **Estrutura de "momentos" na cerimônia:** modelar a cerimônia como uma lista ordenada de
  itens (músicas) com **marcadores de despacho** intercalados em posições, e possibilidade
  de **agrupar músicas em momentos** (cada momento podendo ter um tema próprio) — cobrindo
  tanto cerimônias de tema único quanto as híbridas como "Viver em essência". A numeração
  é sempre automática.
- **Busca full-text na letra:** achar uma música por um trecho da letra (dor dos "arquivos
  antigos").
- **Estado/ciclo de vida da música:** inédita / consolidada / aposentada — ajuda decisões
  de rotação e sugestão.
- **Áudio no nível da execução (não só da música):** vincular o áudio à música *dentro de
  uma cerimônia* (o registro de junção cerimônia↔música), para ouvir "como fizemos naquele
  ano, naquele tom".
- **Estatísticas de música:** "tocada X vezes, última vez em [cerimônia/data], tons mais
  usados: A, B" — apoia a rotação.
- **Locais como entidade leve:** lista de locais reutilizável (Casa de Cura + outros).
- **Multiusuário e permissões (a confirmar):** definir se há papéis (editor vs.
  visualizador; visão instrumentista vs. cantor).

## Estratégia de mídia e custo (ponto de atenção)

Este sistema tende a exigir **mais storage que projetos anteriores** por causa dos áudios.
Precisamos de uma estratégia consciente de custo desde o início:

- Os áudios originais são **WAV grandes (~50MB cada)**; ao longo dos anos isso soma muito.
- Considerar os limites reais: **tamanho máximo de upload do Vercel**, **capacidade/custo
  do Blob Storage**, e **custo do Turso** (linhas/leituras/armazenamento).
- Opções a avaliar (podem ser combinadas):
  1. **Só link do Drive** — o áudio continua no Google Drive; guardamos apenas a URL.
     Custo de storage ~zero, mas depende de conexão e de o link permanecer válido.
  2. **Transcodificar para formato comprimido** (ex.: MP3/AAC/Opus) no upload, reduzindo
     drasticamente o tamanho (de ~50MB para poucos MB) antes de guardar no Blob.
  3. **Híbrido:** master WAV fica no Drive (link), e uma versão comprimida para
     preview/streaming rápido fica no Blob.
- Definir também: precisamos tocar o áudio dentro do app (streaming) ou só ter a
  referência? Isso muda a decisão.

## Análise das amostras reais (arquivos em `public/docs`)

Já examinei 6 arquivos `.docx` reais do grupo. Eles formam uma **mesma família de
layout, porém heterogênea** — o parser de import precisa ser tolerante e heurístico, com
etapa de revisão humana. Arquivos analisados:

- `CERIMONIA CIGANA.docx` (tema único, praticamente um esqueleto de acordes)
- `CERIMONIA ORIENTAL – 29_03_2025.docx` e `Cerimônia Oriental Setembro 2021..docx`
  (mesmo tema, anos diferentes → provam a rotação de repertório)
- `CERIMÔNIA DAS SETE LINHAS.docx` (multi-tema, com temas rotulados por PARTE)
- `REPERTÓRIO FEMININO EM NÓS – MÃES SAGRADAS.docx` (híbrida, letra completa sem cifra)
- `RODA DE CABOCLO - 25.04.2025.docx`

### Padrões observados

- **Cabeçalho:** linha 1 = título da cerimônia (nem sempre com o tema explícito — ex.
  "CERIMÔNIA PRINCIPAL", "FEMININO EM NÓS – MÃES SAGRADAS"); linha 2 costuma trazer data
  (`26/10/2024`) e/ou subtítulo (`NIVER JÉSSICA`).
- **Estrutura em PARTES:** `1ª PARTE`, `2ª PARTE`… Cada parte inicia com um **Despacho**
  (`1º DESPACHO`, com variações `1ºDESPACHO`, `1º Despacho`).
- **Temas por parte (quando existem):** ex. `1ª PARTE - EXU/PG/OGUM/IANSÃ` — bom gancho
  para inferir temas/momentos, mas nem todo arquivo faz isso.
- **Numeração em vários formatos:** `1.`, `1 –`, `1 -`, `1)`, `2)`. Precisa de regex
  multi-formato.
- **Intérprete + instrumento** numa linha em parênteses logo abaixo do nome:
  `(Jéssica e Bruno – violão)`, `(JÉSSICA PUXA)`, `(Jéssica – Ponto/samba – percussão)`.
- **Tom bagunçado:** sufixo no título (`- AM`, `- E`), entre parênteses (`(Dm)`, `(C )`),
  linha própria (`C#m`, `DM - C`), ou textual (`Começa em G`). Muitas vezes é uma
  **progressão de acordes**, não uma tônica única. Distinguir "tom/tônica" de
  "progressão/cifra" no modelo.
- **Capotraste:** `Cap. 3`, `Cap.1`, `cap2` — relevante para o instrumentista.
- **Marcadores especiais:** `(PONTO)`, `(Defumação e despacho)`, `BIS.`,
  `CANTAR PARABÉNS`, `EL PESCADOR - Percussão` (só percussão), e asterisco `*` em certos
  títulos (destaque/recorrente).
- **Conteúdo heterogêneo por arquivo:** alguns só têm progressão de acordes (Cigana),
  outros letra completa sem cifra (Feminino, 7 Linhas), outros letra + acordes por cima
  (La Llorona). Ou seja, mesmo os "sem cifra" contêm alguns acordes.
- **Pool de despacho final:** seção `DESPACHOS` / `EXTRAS - DESPACHO` com músicas **sem
  numeração**, para escolha livre na hora.
- **Identidade de música é não-trivial:**
  - Nomes repetidos distinguidos por `(nº1)`/`(Nº2)` (ex. SARASVATI).
  - Mesma música com **grafias diferentes** entre arquivos (`SARASVATI` × `SARASVATĪ`;
    `YAMUNA TEERA BIHAAREE` × `YAMUNĀ TĪRA VIHĀRE`) → dedup exige normalização + confirmação.
- **Rotação confirmada:** as duas Orientais compartilham muitas músicas com tons, ordem e
  formação diferentes — exatamente o comportamento que o acervo precisa capturar.

### Implicações para o import (a detalhar no plano)

1. Parser heurístico: quebra por PARTE/DESPACHO, detecta numeração multi-formato, associa
   a linha de parênteses seguinte ao intérprete/instrumento, e capta tom/capo/marcadores.
2. **Etapa de staging com revisão humana** antes de gravar no acervo: resolver dedup de
   grafias, confirmar tema quando não explícito, preencher tom faltante, marcar
   percussão/ponto/despacho. (O usuário já aceitou ajustes manuais na fonte de conhecimento.)
3. Gravar **tom no nível da junção cerimônia↔música** (não como atributo global) e
   alimentar o histórico de tons da música a partir disso.
4. Guardar o **texto bruto de acordes/progressão** como estava no arquivo + um campo de
   tom normalizado editável — sem tentar "adivinhar" demais.
5. Inferir tema pelo título do arquivo e pelos rótulos de PARTE; quando não houver, pedir
   input manual.

> Observação: por ora **não há arquivos com cifra dedicada nem PDF final**. A versão com
> cifra (do instrumentista) será introduzida depois, como "upgrade", quando os registros
> sem cifra já estiverem bons. O layout de exportação (PDF/Word) tem muita margem de
> melhora e **não** precisa replicar o Word atual — os Words servem como guia do fluxo
> atual e como fonte de conhecimento das músicas, não como alvo visual.

## Questões técnicas em aberto (decidir no planejamento)

1. **Hospedagem:** o acesso será do grupo (deploy). Base sugerida: **Vercel + libSQL/Turso
   + Vercel Blob** (mesma stack que já usei no meu projeto `sad-notes`). Confirmar,
   considerando a estratégia de mídia/custo acima.
2. **Armazenamento de áudio:** decidir entre link do Drive, transcodificação para formato
   comprimido, ou híbrido (ver seção "Estratégia de mídia e custo").
3. **Import de Word:** já analisei 6 amostras reais (ver seção "Análise das amostras"). O
   que precisa ser decidido: as regras exatas do parser heurístico, o modelo da tela de
   staging/revisão, e a estratégia de dedup por normalização de nomes.
4. **Formato de cifra:** adotar ChordPro como padrão interno? Como lidar com as cifras
   dos arquivos importados?
5. **Layout de exportação:** não precisa replicar o Word atual (há muita margem de
   melhora). Definir do zero um layout limpo para impressão/PDF, respeitando ordem,
   numeração, tom por música, intérpretes, despachos e o pool de despacho. A variante com
   cifra fica para uma fase posterior.
6. **Offline / PWA:** necessário para o dia da cerimônia? Qual grau (só leitura da
   cerimônia, ou edição também)?
7. **Autenticação:** necessária? Simples (uma senha compartilhada) ou por usuário/papéis?
8. **Stack/porta/pasta:** seguir meu padrão (Next.js + SQLite/libSQL, porta na faixa 600x)?
   Sugerir nome de pasta e porta.

## O que eu quero de você agora

1. Faça as perguntas necessárias para fechar as questões em aberto (uma rodada objetiva).
2. Proponha um **modelo de dados** (entidades, relações e principalmente as tabelas de
   junção ricas: cerimônia↔música com tom/ordem/numeração/cantor/flag-de-despacho, e
   música↔tema, cerimônia↔tema, cerimônia↔integrante).
3. Recomende **stack e arquitetura**, com trade-offs, incluindo a estratégia de
   mídia/custo dos áudios.
4. Entregue um **plano de desenvolvimento faseado** (MVP primeiro), deixando claro o que
   fica para cada fase e por quê — com a feature "Montar cerimônia" como prioridade.
5. Ainda **não escreva código** — vamos alinhar o plano primeiro.
