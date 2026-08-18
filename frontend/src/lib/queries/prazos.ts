import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro, naoEhSeu } from "./erros";
import type { Database } from "@/types/database";
import type { NovoPrazo, Prazo, TipoPrazo } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["prazos"]["Row"];
type Insercao = Database["public"]["Tables"]["prazos"]["Insert"];

const TIPOS: TipoPrazo[] = ["Prazo processual", "Audiência", "Recurso"];

function linhaParaPrazo(r: Linha): Prazo {
  return {
    id: r.id,
    numeroProcesso: r.numero_processo,
    parteAutora: r.parte_autora,
    estado: r.estado,
    descricao: r.descricao,
    tipo: TIPOS.includes(r.tipo as TipoPrazo) ? (r.tipo as TipoPrazo) : "Prazo processual",
    advogadoId: r.advogado_id,
    // a coluna é "date": chega como "AAAA-MM-DD" e assim permanece.
    // Não converter para Date aqui — ver o comentário em lib/datas.ts.
    vencimento: r.vencimento,
    criadoPor: r.created_by,
    atualizadoPor: r.updated_by
  };
}

function prazoParaLinha(p: NovoPrazo): Insercao {
  return {
    numero_processo: p.numeroProcesso,
    parte_autora: p.parteAutora,
    estado: p.estado,
    descricao: p.descricao,
    tipo: p.tipo,
    advogado_id: p.advogadoId,
    vencimento: p.vencimento
  };
}

export const chavePrazos = ["prazos"] as const;

export function usePrazos() {
  return useQuery({
    queryKey: chavePrazos,
    queryFn: async (): Promise<Prazo[]> => {
      const { data, error } = await supabase
        .from("prazos")
        .select("*")
        .order("vencimento", { ascending: true });
      if (error) throw new Error(error.message);
      return data.map(linhaParaPrazo);
    }
  });
}

export function useSalvarPrazo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prazo: NovoPrazo & { id?: string }) => {
      const linha = prazoParaLinha(prazo);

      if (prazo.id) {
        const { data, error } = await supabase
          .from("prazos")
          .update(linha)
          .eq("id", prazo.id)
          .select()
          .maybeSingle();
        if (error) throw new Error(traduzirErro(error.message));
        // Zero linhas com sucesso = a RLS filtrou: o prazo é de outra pessoa.
        if (!data) throw new Error(naoEhSeu("prazo"));
        return linhaParaPrazo(data);
      }

      const { data, error } = await supabase.from("prazos").insert(linha).select().single();
      if (error) throw new Error(traduzirErro(error.message));
      return linhaParaPrazo(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chavePrazos })
  });
}

export function useExcluirPrazo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("prazos").delete().eq("id", id).select();
      if (error) throw new Error(traduzirErro(error.message));
      if (!data || data.length === 0) throw new Error(naoEhSeu("prazo"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chavePrazos })
  });
}
