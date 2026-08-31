/**
 * Cálculo do vencimento de um prazo processual.
 *
 * ISTO PRODUZ UMA SUGESTÃO, NUNCA UMA CERTEZA. Leia antes de mexer.
 *
 * A cadeia legal, para prazo processual civil:
 *
 *   1. O DJEN informa a data de DISPONIBILIZAÇÃO no diário.
 *   2. A data de PUBLICAÇÃO é o primeiro dia útil seguinte (CPC art. 224 §2º).
 *   3. A CONTAGEM começa no primeiro dia útil seguinte à publicação (§3º).
 *   4. Conta-se em DIAS ÚTEIS (art. 219), excluindo o dia do começo e
 *      incluindo o do vencimento (art. 224).
 *   5. Não corre entre 20/12 e 20/01 (art. 220).
 *
 * O que este arquivo NÃO sabe, e por isso o resultado precisa de confirmação
 * humana:
 *
 *   - feriados estaduais e municipais, que suspendem prazo na comarca e mudam
 *     de cidade para cidade;
 *   - suspensões decretadas por portaria do tribunal (greve, instabilidade do
 *     sistema, calamidade);
 *   - qual é o prazo aplicável ao ato — 15 dias para contestar, 5 para
 *     embargar, 30 em alguns recursos. Isso depende de ler a intimação.
 *   - prazos de direito material, que correm em dias corridos, não úteis.
 *
 * Por isso todo prazo criado a partir daqui nasce com `confirmado = false`.
 * Errar aqui é perder prazo de cliente, e a responsabilidade é do advogado,
 * não do software. A conta serve para adiantar trabalho, não para substituir
 * a conferência.
 */

import { somarDias, type DataISO } from "./datas";

function iso(ano: number, mes: number, dia: number): DataISO {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Domingo de Páscoa pelo algoritmo gregoriano anônimo. Carnaval, Sexta-feira
 * Santa e Corpus Christi são todos deslocamentos a partir dele.
 */
function pascoa(ano: number): DataISO {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(ano, mes, dia);
}

const cache = new Map<number, Set<DataISO>>();

/**
 * Feriados nacionais e forenses de alcance nacional.
 *
 * Carnaval e Corpus Christi não são feriados civis nacionais, mas são feriados
 * forenses em todo o país — o expediente forense não funciona, e prazo não
 * corre. Ficam aqui por isso.
 */
export function feriadosNacionais(ano: number): Set<DataISO> {
  const guardado = cache.get(ano);
  if (guardado) return guardado;

  const p = pascoa(ano);

  const dias = new Set<DataISO>([
    iso(ano, 1, 1),    // Confraternização Universal
    iso(ano, 4, 21),   // Tiradentes
    iso(ano, 5, 1),    // Dia do Trabalho
    iso(ano, 9, 7),    // Independência
    iso(ano, 10, 12),  // Nossa Senhora Aparecida
    iso(ano, 11, 2),   // Finados
    iso(ano, 11, 15),  // Proclamação da República
    iso(ano, 11, 20),  // Consciência Negra (nacional desde a Lei 14.759/2023)
    iso(ano, 12, 25),  // Natal

    somarDias(p, -48), // segunda de carnaval
    somarDias(p, -47), // terça de carnaval
    somarDias(p, -2),  // Sexta-feira Santa
    somarDias(p, 60)   // Corpus Christi
  ]);

  cache.set(ano, dias);
  return dias;
}

/** 20/12 a 20/01, inclusive — CPC art. 220. */
export function noRecesso(data: DataISO): boolean {
  const [, mes, dia] = data.split("-").map(Number);
  if (!mes || !dia) return false;
  return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 20);
}

export function ehDiaUtil(data: DataISO): boolean {
  const [ano, mes, dia] = data.split("-").map(Number);
  if (!ano || !mes || !dia) return false;

  const semana = new Date(ano, mes - 1, dia).getDay();
  if (semana === 0 || semana === 6) return false;

  if (feriadosNacionais(ano).has(data)) return false;
  if (noRecesso(data)) return false;

  return true;
}

/** O primeiro dia útil a partir de `data`, inclusive. */
export function primeiroDiaUtil(data: DataISO): DataISO {
  let atual = data;
  // 40 dias cobre com folga o maior bloqueio possível (o recesso inteiro)
  for (let i = 0; i < 40 && !ehDiaUtil(atual); i++) atual = somarDias(atual, 1);
  return atual;
}

export interface Calculo {
  /** o que o DJEN informou */
  disponibilizacao: DataISO;
  /** primeiro dia útil seguinte — CPC art. 224 §2º */
  publicacao: DataISO;
  /** primeiro dia útil seguinte à publicação — §3º */
  inicio: DataISO;
  /** o dia que se inclui na contagem — art. 224 */
  vencimento: DataISO;
  diasUteis: number;
  /** o que a conta não considerou; sempre tem algo aqui */
  avisos: string[];
}

/**
 * Calcula o vencimento a partir da disponibilização no diário.
 *
 * @param diasUteis tamanho do prazo. Não é deduzido do texto da intimação de
 *                  propósito: adivinhar isso e apresentar como certeza é
 *                  exatamente o erro que este arquivo existe para evitar.
 */
export function calcularPrazo(disponibilizacao: DataISO, diasUteis: number): Calculo {
  const publicacao = primeiroDiaUtil(somarDias(disponibilizacao, 1));
  const inicio = primeiroDiaUtil(somarDias(publicacao, 1));

  // O dia de início já conta como o primeiro dia do prazo.
  let vencimento = inicio;
  for (let contados = 1; contados < diasUteis; contados++) {
    vencimento = primeiroDiaUtil(somarDias(vencimento, 1));
  }

  const avisos = [
    "Não considera feriados estaduais e municipais — eles suspendem o prazo na comarca e variam de cidade para cidade.",
    "Não considera suspensões por portaria do tribunal (greve, instabilidade do sistema, calamidade).",
    `Assume ${diasUteis} dias úteis. O prazo real depende do ato e está no texto da intimação.`
  ];

  if (cruzaRecesso(inicio, vencimento)) {
    avisos.push("O recesso de 20/12 a 20/01 foi descontado da contagem (CPC art. 220).");
  }

  return { disponibilizacao, publicacao, inicio, vencimento, diasUteis, avisos };
}

function cruzaRecesso(de: DataISO, ate: DataISO): boolean {
  let atual = de;
  for (let i = 0; i < 400 && atual <= ate; i++) {
    if (noRecesso(atual)) return true;
    atual = somarDias(atual, 1);
  }
  return false;
}
