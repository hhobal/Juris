import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro } from "./erros";
import { linhaParaAdvogado } from "./advogados";
import { chaveSessao } from "./sessao";
import type { Advogado } from "@/types/dominio";

/**
 * Editar o próprio cadastro — nome, OAB, cargo, cor, tribunais. Não existe mais "editar
 * o cadastro de outro advogado": sem equipe, o único cadastro que existe
 * pra quem está logado é o dele mesmo, então a RLS ("dono edita o próprio
 * cadastro") já garante isso sozinha, sem precisar de um `id` no payload.
 */
type Salvavel = Pick<
  Advogado,
  "nome" | "oabNumero" | "oabUf" | "tribunaisMonitorados" | "cargo" | "cor"
>;

export function useSalvarPerfil(euId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (perfil: Salvavel) => {
      const linha = {
        nome: perfil.nome,
        oab_numero: perfil.oabNumero || null,
        oab_uf: perfil.oabUf || null,
        tribunais_monitorados: perfil.tribunaisMonitorados,
        cargo: perfil.cargo || null,
        cor: perfil.cor
      };

      const { data, error } = await supabase
        .from("advogados")
        .update(linha)
        .eq("id", euId)
        .select()
        .single();
      if (error) throw new Error(traduzirErro(error.message));
      return linhaParaAdvogado(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaveSessao })
  });
}
