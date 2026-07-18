import {
  parseChordPro,
  preferFlatSpelling,
  parseTomRoot,
  semitonesEntre,
  transposeLines,
} from "@/lib/chordpro";

/** Renderiza o ChordPro de uma música transposto pro tom do item na cerimônia. */
export default function Cifra({
  chordpro,
  tomBase,
  tomDestino,
}: {
  chordpro: string;
  tomBase: string | null;
  tomDestino: string | null;
}) {
  const linhas = parseChordPro(chordpro);
  const semitons = semitonesEntre(tomBase, tomDestino);
  const tentouTranspor = !!(tomBase && tomDestino);
  const falhouReconhecer = tentouTranspor && semitons === null;

  let linhasFinal = linhas;
  if (semitons !== null) {
    const destino = tomDestino ? parseTomRoot(tomDestino) : null;
    const preferFlat = destino ? preferFlatSpelling(destino.rootIndex, destino.isMinor) : false;
    linhasFinal = transposeLines(linhas, semitons, preferFlat);
  }

  return (
    <div className="folha-cifra">
      {falhouReconhecer && (
        <p className="folha-cifra-aviso">
          Não foi possível transpor automaticamente (tom não reconhecido) — cifra no
          tom original.
        </p>
      )}
      {linhasFinal.map((linha, i) => {
        if (linha.chunks.length === 0) {
          return <div key={i} className="folha-cifra-linha-vazia" aria-hidden="true" />;
        }
        const temAcorde = linha.chunks.some((c) => c.chord !== null);
        if (!temAcorde) {
          return (
            <p key={i} className="folha-cifra-texto-solo">
              {linha.chunks[0].text}
            </p>
          );
        }
        // Progressão pura (sem letra nenhuma): o colchete original volta a aparecer
        // no resultado — aqui ele é separador visual, não marcação invisível de
        // "acorde colado na sílaba" (isso continua escondido no chordpro padrão).
        // Ignora o texto de pedaços sem acorde (ex. um rótulo "Intro: " antes do
        // colchete) — só importa se os acordes em si têm letra colada ou não.
        const soProgressao = linha.chunks.every(
          (c) => c.chord === null || c.text.trim() === ""
        );
        return (
          <div
            key={i}
            className={`folha-cifra-linha${soProgressao ? " folha-cifra-linha-progressao" : ""}`}
          >
            {linha.chunks.map((c, j) => {
              let acorde = c.chord ?? " ";
              if (soProgressao && c.chord) {
                if (c.abreColchete) acorde = "[" + acorde;
                if (c.fechaColchete) acorde = acorde + "]";
              }
              return (
                <span key={j} className="folha-cifra-chunk">
                  <span className="folha-cifra-acorde">{acorde}</span>
                  <span className="folha-cifra-silaba">{c.text || " "}</span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
