import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { traduzirErro } from "./erros";
import { chaveAdvogados, linhaParaAdvogado } from "./advogados";
import { chaveSessao } from "./sessao";
import type { Advogado } from "@/types/dominio";

/**
 * A tela de equipe precisa enxergar quem está desativado — o `useAdvogados()`
 * devolve só os ativos, porque serve para preencher seletor de responsável.
 */
export const chaveEquipe = ["equipe"] as const;

export function useEquipe() {
  return useQuery({
    queryKey: chaveEquipe,
    queryFn: async (): Promise<Advogado[]> => {
      const { data, error } = await supabase
        .from("advogados")
        .select("*")
        .order("ativo", { ascending: false })
        .order("nome");
      if (error) throw new Error(traduzirErro(error.message));
      return data.map(linhaParaAdvogado);
    }
  });
}

type Salvavel = Pick<Advogado, "nome" | "email" | "oab" | "cargo" | "cor" | "papel" | "ativo"> & {
  id?: string;
};

export function useSalvarAdvogado() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (adv: Salvavel) => {
      const linha = {
        nome: adv.nome,
        email: adv.email.trim().toLowerCase(),
        oab: adv.oab || null,
        cargo: adv.cargo || null,
        cor: adv.cor,
        papel: adv.papel,
        ativo: adv.ativo
      };

      if (adv.id) {
        const { data, error } = await supabase
          .from("advogados")
          .update(linha)
          .eq("id", adv.id)
          .select()
          .maybeSingle();
        if (error) throw new Error(traduzirMensagem(error.message));
        if (!data) {
          throw new Error(
            "Você só pode editar o seu próprio cadastro. Alterar o de um colega é coisa de administrador."
          );
        }
        return linhaParaAdvogado(data);
      }

      const { data, error } = await supabase.from("advogados").insert(linha).select().single();
      if (error) throw new Error(traduzirMensagem(error.message));
      return linhaParaAdvogado(data);
    },

    onSuccess: () => {
      // A pessoa pode ter mudado o próprio nome ou cor: o cabeçalho reflete isso.
      qc.invalidateQueries({ queryKey: chaveEquipe });
      qc.invalidateQueries({ queryKey: chaveAdvogados });
      qc.invalidateQueries({ queryKey: chaveSessao });
    }
  });
}

/** O banco fala em constraint; o advogado precisa entender o que fazer. */
function traduzirMensagem(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("duplicate key") && m.includes("email")) {
    return "Já existe um cadastro com este e-mail.";
  }
  if (m.includes("administrador pode alterar papel")) {
    return "Somente um administrador pode mudar o papel ou desativar alguém.";
  }
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "Seu perfil não tem permissão para esta ação.";
  }
  return traduzirErro(mensagem);
}
