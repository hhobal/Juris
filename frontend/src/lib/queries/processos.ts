import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro, naoEhSeu } from "./erros";
import type { Database } from "@/types/database";
import type { Processo, StatusProcesso } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["processos"]["Row"];
type Insercao = Database["public"]["Tables"]["processos"]["Insert"];

const STATUS: StatusProcesso[] = ["Em andamento", "Suspenso", "Encerrado"];

function linhaParaProcesso(r: Linha): Processo {
  return {
    id: r.id,
    numero: r.numero,
    parte: r.parte,
    tipo: r.tipo,
    tribunal: r.tribunal,
    vara: r.vara,
    advogadoId: r.advogado_id,
    status: STATUS.includes(r.status as StatusProcesso)
      ? (r.status as StatusProcesso)
      : "Em andamento",
    fase: r.fase,
    // coluna NOT NULL default 0 desde a migration — não volta nulo
    valorCausa: Number(r.valor_causa ?? 0),
    distribuicao: r.distribuicao,
    ultimaMov: r.ultima_mov,
    origem: r.origem === "djen" ? "djen" : "manual"
  };
}

/**
 * `origem` fica de fora de propósito: quem cadastra pela tela é sempre o
 * advogado, e o default 'manual' da coluna já diz isso. Só a importação de
 * uma publicação escreve 'djen', e ela monta a linha por conta própria.
 */
function processoParaLinha(p: Omit<Processo, "id" | "origem">): Insercao {
  return {
    numero: p.numero,
    parte: p.parte,
    tipo: p.tipo || null,
    tribunal: p.tribunal || null,
    vara: p.vara || null,
    advogado_id: p.advogadoId,
    status: p.status,
    fase: p.fase || null,
    valor_causa: p.valorCausa,
    // <input type="date"> vazio manda "", que o Postgres recusa numa coluna date
    distribuicao: p.distribuicao || null,
    ultima_mov: p.ultimaMov || null
  };
}

export const chaveProcessos = ["processos"] as const;

export function useProcessos() {
  return useQuery({
    queryKey: chaveProcessos,
    queryFn: async (): Promise<Processo[]> => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("distribuicao", { ascending: false, nullsFirst: false });
      if (error) throw new Error(traduzirErro(error.message));
      return data.map(linhaParaProcesso);
    }
  });
}

export function useSalvarProcesso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (processo: Omit<Processo, "id" | "origem"> & { id?: string }) => {
      const linha = processoParaLinha(processo);

      if (processo.id) {
        // Atualiza pelo id, não pelo número: assim dá para corrigir um número
        // digitado errado sem perder a referência da linha.
        const { data, error } = await supabase
          .from("processos")
          .update(linha)
          .eq("id", processo.id)
          .select()
          .maybeSingle();
        if (error) throw new Error(traduzirErro(error.message));
        if (!data) throw new Error(naoEhSeu("processo"));
        return linhaParaProcesso(data);
      }

      const { data, error } = await supabase.from("processos").insert(linha).select().single();
      if (error) throw new Error(traduzirErro(error.message));
      return linhaParaProcesso(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveProcessos })
  });
}

export function useExcluirProcesso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("processos").delete().eq("id", id).select();
      if (error) throw new Error(traduzirErro(error.message));
      if (!data || data.length === 0) throw new Error(naoEhSeu("processo"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveProcessos })
  });
}
