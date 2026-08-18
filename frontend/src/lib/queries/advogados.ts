import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { Advogado, Papel } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["advogados"]["Row"];

const PAPEIS: Papel[] = ["admin", "advogado", "consulta"];

export function linhaParaAdvogado(r: Linha): Advogado {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    oab: r.oab,
    cargo: r.cargo,
    cor: r.cor ?? "#8B93A6",
    iniciais: r.iniciais ?? iniciaisDe(r.nome),
    // "papel" é text no banco (com check constraint). Estreito aqui para o
    // union do domínio, com um padrão seguro se vier algo inesperado.
    papel: PAPEIS.includes(r.papel as Papel) ? (r.papel as Papel) : "consulta",
    ativo: r.ativo,
    temLogin: r.auth_user_id !== null
  };
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

export const chaveAdvogados = ["advogados"] as const;

export function useAdvogados() {
  return useQuery({
    queryKey: chaveAdvogados,
    queryFn: async (): Promise<Advogado[]> => {
      const { data, error } = await supabase
        .from("advogados")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw new Error(error.message);
      return data.map(linhaParaAdvogado);
    },
    staleTime: 5 * 60 * 1000
  });
}
