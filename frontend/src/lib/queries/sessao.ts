import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { linhaParaAdvogado } from "./advogados";
import type { Advogado } from "@/types/dominio";

/**
 * Login e perfil nascem juntos: quem se cadastra ganha uma linha em
 * `advogados` na hora, criada pelo trigger `handle_new_user` no banco — não
 * existe mais admin convidando ninguém. Mesmo assim todo caminho aqui
 * confere o perfil depois de autenticar, e encerra a sessão se ele não
 * existir ou estiver desativado: casos raros (perfil apagado por fora do
 * app, conta desativada por quem administra o sistema), mas que a RLS já
 * bloquearia de qualquer forma — melhor a tela explicar o que houve.
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
          "Não encontrei um perfil para esta conta. Tente criar a conta novamente."
        );
      }
      if (linha.ativo === false) {
        await supabase.auth.signOut();
        throw new SemAcesso("Este acesso foi desativado.");
      }

      return linhaParaAdvogado(linha);
    },
    onSuccess: (advogado) => qc.setQueryData(chaveSessao, advogado)
  });
}

/**
 * Cria a conta e o perfil de uma vez. O perfil em si nasce no banco (trigger
 * `handle_new_user`, ver a migration "advogado_autonomo") assim que o Auth
 * confirma o cadastro — aqui só entra na sessão se já vier com uma ativa.
 *
 * Sem confirmação de e-mail ligada no projeto, `signUp` já devolve uma
 * sessão pronta. Com confirmação ligada, `data.session` vem nulo e a pessoa
 * precisa clicar no link do e-mail antes de conseguir entrar.
 */
export function useCriarConta() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ nome, email, senha }: { nome: string; email: string; senha: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } }
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          throw new Error("Já existe uma conta com este e-mail. Tente entrar em vez de criar uma nova.");
        }
        if (msg.includes("password")) {
          throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        }
        throw new Error(error.message);
      }

      if (!data.session) {
        return { confirmacaoPendente: true as const };
      }

      const { data: linha } = await supabase
        .from("advogados")
        .select("*")
        .eq("auth_user_id", data.user!.id)
        .maybeSingle();

      if (!linha) {
        throw new Error(
          "A conta foi criada, mas não consegui carregar o perfil ainda. Tente entrar em alguns instantes."
        );
      }

      return { confirmacaoPendente: false as const, advogado: linhaParaAdvogado(linha) };
    },
    onSuccess: (resultado) => {
      if (!resultado.confirmacaoPendente) qc.setQueryData(chaveSessao, resultado.advogado);
    }
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
