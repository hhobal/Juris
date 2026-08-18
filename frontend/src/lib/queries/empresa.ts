import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro } from "./erros";
import type { Empresa } from "@/types/dominio";

/**
 * O app antigo nunca chegou a ler esta tabela: a tela de Configurações mostrava
 * "Grupo Exemplo Indústria e Comércio Ltda." fixo no código, vindo do data.js,
 * para qualquer escritório. Aqui ela vem do banco de verdade.
 */
export const chaveEmpresa = ["empresa"] as const;

export function useEmpresa() {
  return useQuery({
    queryKey: chaveEmpresa,
    queryFn: async (): Promise<Empresa | null> => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(traduzirErro(error.message));
      return data ? { id: data.id, razaoSocial: data.razao_social, cnpj: data.cnpj } : null;
    },
    staleTime: 30 * 60 * 1000
  });
}
