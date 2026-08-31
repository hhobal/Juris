import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro } from "./erros";
import { chaveProcessos } from "./processos";
import type { Database } from "@/types/database";
import type { Compartilhamento } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["compartilhamentos"]["Row"];

function linhaParaCompartilhamento(r: Linha): Compartilhamento {
  return {
    id: r.id,
    processoId: r.processo_id,
    donoId: r.dono_id,
    emailConvidado: r.email_convidado
  };
}

/**
 * A chave inclui o processo: cada processo tem a sua lista, e compartilhar um
 * não invalida a lista do outro.
 */
export const chaveCompartilhamentos = (processoId: string) =>
  ["compartilhamentos", processoId] as const;

export function useCompartilhamentos(processoId: string) {
  return useQuery({
    queryKey: chaveCompartilhamentos(processoId),
    queryFn: async (): Promise<Compartilhamento[]> => {
      const { data, error } = await supabase
        .from("compartilhamentos")
        .select("*")
        .eq("processo_id", processoId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(traduzirErro(error.message));
      return data.map(linhaParaCompartilhamento);
    }
  });
}

export function useCompartilhar(processoId: string, donoId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const limpo = email.trim().toLowerCase();
      if (!limpo.includes("@") || limpo.startsWith("@")) {
        throw new Error("Digite um e-mail válido.");
      }

      const { data, error } = await supabase
        .from("compartilhamentos")
        .insert({ processo_id: processoId, dono_id: donoId, email_convidado: limpo })
        .select()
        .single();
      if (error) throw new Error(traduzirErro(error.message));
      return linhaParaCompartilhamento(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveCompartilhamentos(processoId) })
  });
}

export function useDescompartilhar(processoId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("compartilhamentos")
        .delete()
        .eq("id", id)
        .select();
      if (error) throw new Error(traduzirErro(error.message));
      if (!data || data.length === 0) {
        throw new Error("Só quem é dono do processo pode desfazer o compartilhamento.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaveCompartilhamentos(processoId) });
      // quem perdeu o acesso precisa sumir com o processo da lista dele
      qc.invalidateQueries({ queryKey: chaveProcessos });
    }
  });
}
