/**
 * Normaliza texto para dedup/busca: minúsculas, sem acentos, espaços colapsados.
 * Usado no `nome_normalizado` das músicas (dedup no import) e em buscas.
 * Ex.: "SARASVATĪ" e "Sarasvati" → "sarasvati".
 */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
