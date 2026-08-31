/**
 * O número único do CNJ carrega informação, não é só identificador.
 *
 * Formato (Resolução CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO
 *
 *   NNNNNNN  sequencial por ano e origem
 *   DD       dígito verificador
 *   AAAA     ano do ajuizamento
 *   J        segmento do Judiciário (8 = estadual, 5 = trabalho, 4 = federal…)
 *   TR       tribunal dentro do segmento
 *   OOOO     unidade de origem (comarca, vara)
 *
 * Extrair a UF daqui evita perguntar ao advogado o que o próprio número já
 * responde — e evita o erro de digitação que uma pergunta desnecessária cria.
 */

/** Justiça Estadual (J=8): TR segue a ordem alfabética dos estados. */
const ESTADUAL: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AP", "04": "AM", "05": "BA", "06": "CE",
  "07": "DF", "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS",
  "13": "MG", "14": "PA", "15": "PB", "16": "PR", "17": "PE", "18": "PI",
  "19": "RJ", "20": "RN", "21": "RS", "22": "RO", "23": "RR", "24": "SC",
  "25": "SE", "26": "SP", "27": "TO"
};

/**
 * Justiça do Trabalho (J=5): TR é a região do TRT, que nem sempre é um estado
 * só. Onde a região abrange mais de uma UF, fica a sede — é a aproximação
 * honesta, e o advogado corrige se precisar.
 */
const TRABALHO: Record<string, string> = {
  "01": "RJ", "02": "SP", "03": "MG", "04": "RS", "05": "BA", "06": "PE",
  "07": "CE", "08": "PA", "09": "PR", "10": "DF", "11": "AM", "12": "SC",
  "13": "PB", "14": "RO", "15": "SP", "16": "MA", "17": "ES", "18": "GO",
  "19": "AL", "20": "SE", "21": "RN", "22": "PI", "23": "MT", "24": "MS"
};

/**
 * A UF de um processo, deduzida do número.
 *
 * Devolve null quando não dá para saber com segurança — Justiça Federal, por
 * exemplo, onde um TRF cobre vários estados. Melhor um campo vazio do que um
 * estado errado preenchido com cara de certeza.
 */
export function ufDoNumeroCnj(numero: string): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length !== 20) return null;

  // NNNNNNN(7) DD(2) AAAA(4) J(1) TR(2) OOOO(4)
  const segmento = digitos.slice(13, 14);
  const tribunal = digitos.slice(14, 16);

  if (segmento === "8") return ESTADUAL[tribunal] ?? null;
  if (segmento === "5") return TRABALHO[tribunal] ?? null;
  return null;
}

/** "TJPR" -> "PR", "TRT9" -> null. Só serve para os tribunais estaduais. */
export function ufDaSigla(sigla: string | null): string | null {
  const s = (sigla ?? "").toUpperCase().trim();
  if (!/^TJ[A-Z]{2}$/.test(s)) return null;
  const uf = s.slice(2);
  return Object.values(ESTADUAL).includes(uf) ? uf : null;
}
