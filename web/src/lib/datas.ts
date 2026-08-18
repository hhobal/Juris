/**
 * Datas de calendário — vencimento, prazo, distribuição — são strings
 * "AAAA-MM-DD", sem hora e sem fuso, do banco até a tela.
 *
 * A regra é uma só: nunca passe uma dessas strings direto para `new Date()`.
 * O JavaScript lê "2026-08-22" como meia-noite em UTC, que no horário do
 * Brasil ainda é dia 21 — e o prazo aparece vencendo um dia antes.
 */

export type DataISO = string; // "AAAA-MM-DD"

/** Meia-noite no fuso local, montada componente a componente. */
function paraDataLocal(iso: DataISO): Date | null {
  const partes = iso.slice(0, 10).split("-").map(Number);
  const [ano, mes, dia] = partes;
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

export function hoje(): DataISO {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatar(iso: DataISO | null): string {
  if (!iso) return "—";
  const partes = iso.slice(0, 10).split("-");
  const [ano, mes, dia] = partes;
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
}

export function diasAte(iso: DataISO): number {
  const alvo = paraDataLocal(iso);
  if (!alvo) return 0;
  const agora = new Date();
  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000);
}

export interface Urgencia {
  cls: "vencido" | "hoje" | "urgente" | "atencao" | "tranquilo";
  label: string;
}

export function urgencia(iso: DataISO): Urgencia {
  const d = diasAte(iso);
  if (d < 0) return { cls: "vencido", label: `Vencido há ${Math.abs(d)}d` };
  if (d === 0) return { cls: "hoje", label: "Vence hoje" };
  if (d === 1) return { cls: "urgente", label: "Vence amanhã" };
  if (d <= 3) return { cls: "urgente", label: `${d} dias restantes` };
  if (d <= 7) return { cls: "atencao", label: `${d} dias restantes` };
  return { cls: "tranquilo", label: `${d} dias restantes` };
}
