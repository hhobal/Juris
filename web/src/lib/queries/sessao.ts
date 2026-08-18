import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { linhaParaAdvogado } from "./advogados";
import type { Advogado } from "@/types/dominio";

/**
 * Senha certa não é o mesmo que ter acesso.
 *
 * Quem autoriza a entrada é o cadastro em `advogados`, feito por um
 * administrador — o login sozinho não autoriza nada. Por isso todo caminho
 * aqui confere o perfil depois de autenticar, e encerra a sessão se não
 * houver perfil ou se ele estiver desativado.
 */

class SemAcesso extends Error {}

async function perfilDaSessao(): Promise<Advogado | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const { data: linha } = await supabase
    .from("advogados")
    .select("*")
    .eq("auth_user_id", data.session.user.id)
    .maybeSingle();

  if (!linha || linha.ativo === false) {
    await supabase.auth.signOut();
    return null;
  }
  return linhaParaAdvogado(linha);
}

export const chaveSessao = ["sessao"] as const;

export function useSessao() {
  return useQuery({
    queryKey: chaveSessao,
    queryFn: perfilDaSessao,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}

export function useEntrar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, senha }: { email: string; senha: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          throw new Error("E-mail ou senha inválidos.");
        }
        if (msg.includes("email not confirmed")) {
          throw new Error(
            "Este e-mail ainda não foi confirmado. Peça a um administrador para confirmá-lo no painel."
          );
        }
        throw new Error(error.message);
      }

      const { data: linha } = await supabase
        .from("advogados")
        .select("*")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (!linha) {
        await supabase.auth.signOut();
        throw new SemAcesso(
          "Este e-mail não tem acesso ao sistema. Peça a um administrador para cadastrá-lo em Advogados."
        );
      }
      if (linha.ativo === false) {
        await supabase.auth.signOut();
        throw new SemAcesso("Este acesso foi desativado. Procure um administrador.");
      }

      return linhaParaAdvogado(linha);
    },
    onSuccess: (advogado) => qc.setQueryData(chaveSessao, advogado)
  });
}

export function useSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      // A ordem aqui importa, e custou um bug para descobrir.
      //
      // Atualizar a sessão para null PRIMEIRO, no lugar: assim o useQuery já
      // montado é notificado na hora e o app volta para o login.
      //
      // Fazer clear() antes não funciona: ele destrói a entrada do cache, o
      // observador montado continua apontando para a entrada destruída, e o
      // setQueryData seguinte cria outra que ninguém está observando. O efeito
      // era clicar em Sair, a sessão cair no Supabase, e a tela continuar
      // aberta como se nada tivesse acontecido.
      qc.setQueryData(chaveSessao, null);

      // Só então o resto do cache vai embora, para nada da sessão anterior
      // sobrar em memória para quem usar a máquina depois.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== chaveSessao[0] });
    }
  });
}
