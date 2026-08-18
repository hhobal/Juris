import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro, naoEhSeu } from "./erros";
import type { Database } from "@/types/database";
import type { ColunaTarefa, Prioridade, Tarefa } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["tarefas"]["Row"];
type Insercao = Database["public"]["Tables"]["tarefas"]["Insert"];

const COLUNAS: ColunaTarefa[] = ["fazer", "andamento", "aguardando", "concluido"];
const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];

function linhaParaTarefa(r: Linha): Tarefa {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao,
    processoNumero: r.processo_numero,
    advogadoId: r.advogado_id,
    coluna: COLUNAS.includes(r.coluna as ColunaTarefa) ? (r.coluna as ColunaTarefa) : "fazer",
    prioridade: PRIORIDADES.includes(r.prioridade as Prioridade)
      ? (r.prioridade as Prioridade)
      : "media",
    // coluna "date": chega "AAAA-MM-DD" e assim fica. Ver lib/datas.ts.
    prazo: r.prazo
  };
}

function tarefaParaLinha(t: Omit<Tarefa, "id">): Insercao {
  return {
    titulo: t.titulo,
    descricao: t.descricao || null,
    processo_numero: t.processoNumero || null,
    advogado_id: t.advogadoId,
    coluna: t.coluna,
    prioridade: t.prioridade,
    prazo: t.prazo
  };
}

export const chaveTarefas = ["tarefas"] as const;

export function useTarefas() {
  return useQuery({
    queryKey: chaveTarefas,
    queryFn: async (): Promise<Tarefa[]> => {
      const { data, error } = await supabase
        .from("tarefas")
        .select("*")
        .order("prazo", { ascending: true, nullsFirst: false });
      if (error) throw new Error(traduzirErro(error.message));
      return data.map(linhaParaTarefa);
    }
  });
}

export function useSalvarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tarefa: Omit<Tarefa, "id"> & { id?: string }) => {
      const linha = tarefaParaLinha(tarefa);

      if (tarefa.id) {
        const { data, error } = await supabase
          .from("tarefas")
          .update(linha)
          .eq("id", tarefa.id)
          .select()
          .maybeSingle();
        if (error) throw new Error(traduzirErro(error.message));
        if (!data) throw new Error(naoEhSeu("tarefa"));
        return linhaParaTarefa(data);
      }

      const { data, error } = await supabase.from("tarefas").insert(linha).select().single();
      if (error) throw new Error(traduzirErro(error.message));
      return linhaParaTarefa(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveTarefas })
  });
}

/**
 * Mover card entre colunas, com atualização otimista.
 *
 * Num quadro kanban a espera pela rede é sentida: o card precisa acompanhar o
 * mouse na hora. Então a lista local muda primeiro e, se o banco recusar
 * (tarefa de outro advogado), volta para onde estava.
 */
export function useMoverTarefa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, coluna }: { id: string; coluna: ColunaTarefa }) => {
      const { data, error } = await supabase
        .from("tarefas")
        .update({ coluna })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw new Error(traduzirErro(error.message));
      if (!data) throw new Error(naoEhSeu("tarefa"));
      return linhaParaTarefa(data);
    },

    onMutate: async ({ id, coluna }) => {
      await qc.cancelQueries({ queryKey: chaveTarefas });
      const anterior = qc.getQueryData<Tarefa[]>(chaveTarefas);
      qc.setQueryData<Tarefa[]>(chaveTarefas, (lista) =>
        (lista ?? []).map((t) => (t.id === id ? { ...t, coluna } : t))
      );
      return { anterior };
    },

    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) qc.setQueryData(chaveTarefas, contexto.anterior);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: chaveTarefas })
  });
}

export function useExcluirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("tarefas").delete().eq("id", id).select();
      if (error) throw new Error(traduzirErro(error.message));
      if (!data || data.length === 0) throw new Error(naoEhSeu("tarefa"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveTarefas })
  });
}
