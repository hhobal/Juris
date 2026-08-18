/** Valores em reais, no formato que um advogado espera ler. */
export function moeda(v: number | null): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Para busca: minúsculas e sem acento, dos dois lados da comparação.
 * Assim "citacao" encontra "Citação" e "jose" encontra "José".
 */
export function normalizar(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    // NFD separa a letra do acento; o bloco U+0300–U+036F são os acentos que
    // sobram soltos. Escrito com escape de propósito: como caractere literal
    // ficaria invisível no editor, e uma conversão de encoding do arquivo o
    // quebraria em silêncio.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
