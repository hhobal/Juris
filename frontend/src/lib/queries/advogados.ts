import type { Database } from "@/types/database";
import type { Advogado } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["advogados"]["Row"];

export function linhaParaAdvogado(r: Linha): Advogado {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    oabNumero: r.oab_numero,
    oabUf: r.oab_uf,
    tribunaisMonitorados: r.tribunais_monitorados ?? [],
    cargo: r.cargo,
    cor: r.cor ?? "#C9A24B",
    iniciais: r.iniciais ?? iniciaisDe(r.nome),
    ativo: r.ativo,
    temLogin: r.auth_user_id !== null
  };
}

/** "OAB/PR 45211", ou null se a inscrição ainda não foi preenchida. */
export function oabTexto(a: Advogado): string | null {
  return a.oabNumero && a.oabUf ? `OAB/${a.oabUf} ${a.oabNumero}` : null;
}

/** "Dra. Camila Rezende" -> "CR", ignorando o tratamento. */
function iniciaisDe(nome: string): string {
  const limpo = nome.replace(/^\s*(dra?\.?)\s+/i, "");
  const partes = limpo.split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] ?? "").concat(partes[1]?.[0] ?? "").toUpperCase();
}

/** Primeiro nome, para saudações e abas — também ignora "Dr."/"Dra.". */
export function primeiroNome(nome: string): string {
  const limpo = nome.replace(/^\s*(dra?\.?)\s+/i, "");
  return limpo.split(/\s+/)[0] ?? nome;
}
