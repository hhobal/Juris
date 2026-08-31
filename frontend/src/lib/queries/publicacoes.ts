import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buscarPublicacoes } from "@/lib/djen";
import { buscarFicha } from "@/lib/datajud";
import { formatar } from "@/lib/datas";
import { traduzirErro } from "./erros";
import { chaveProcessos } from "./processos";
import type { Database } from "@/types/database";
import type { Advogado, Publicacao, SituacaoPublicacao } from "@/types/dominio";

type Linha = Database["public"]["Tables"]["publicacoes"]["Row"];
type Insercao = Database["public"]["Tables"]["publicacoes"]["Insert"];

const SITUACOES: SituacaoPublicacao[] = ["nova", "conferida", "ignorada"];

function linhaParaPublicacao(r: Linha): Publicacao {
  return {
    id: r.id,
    cnjId: r.cnj_id,
    numeroProcesso: r.numero_processo,
    numeroProcessoLimpo: r.numero_processo_limpo,
    tribunal: r.tribunal,
    orgao: r.orgao,
    classe: r.classe,
    tipo: r.tipo,
    disponibilizacao: r.disponibilizacao,
    partes: r.partes ?? [],
    advogadosIntimados: r.advogados_intimados ?? [],
    link: r.link,
    teor: r.teor,
    situacao: SITUACOES.includes(r.situacao as SituacaoPublicacao)
      ? (r.situacao as SituacaoPublicacao)
      : "nova",
    processoId: r.processo_id
  };
}

export const chavePublicacoes = ["publicacoes"] as const;

export function usePublicacoes() {
  return useQuery({
    queryKey: chavePublicacoes,
    queryFn: async (): Promise<Publicacao[]> => {
      const { data, error } = await supabase
        .from("publicacoes")
        .select("*")
        .order("disponibilizacao", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(traduzirErro(error.message));
      return data.map(linhaParaPublicacao);
    }
  });
}

export interface Resumo {
  /** quantas o CNJ devolveu no período */
  encontradas: number;
  /** quantas dessas o sistema ainda não conhecia */
  novas: number;
  /** o teto de páginas foi atingido: pode ter ficado publicação de fora */
  truncado: boolean;
}

/**
 * Consulta o CNJ e guarda o que for inédito.
 *
 * O upsert com `ignoreDuplicates` é o coração do "o que há de novo?": o índice
 * único (advogado_id, cnj_id) faz o banco descartar o que já existe, e o
 * `select()` devolve **só as linhas efetivamente inseridas**. Ou seja, a
 * contagem de novas sai de graça, sem precisar comparar nada na mão.
 */
export function useSincronizarPublicacoes(eu: Advogado) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ de, ate }: { de: string; ate: string }): Promise<Resumo> => {
      if (!eu.oabNumero || !eu.oabUf) {
        throw new Error("Cadastre seu número e sua seccional da OAB antes de consultar.");
      }

      const { itens, truncado } = await buscarPublicacoes({
        numeroOab: eu.oabNumero,
        ufOab: eu.oabUf,
        de,
        ate,
        tribunais: eu.tribunaisMonitorados
      });

      if (itens.length === 0) return { encontradas: 0, novas: 0, truncado };

      const linhas: Insercao[] = itens.map((p) => ({
        advogado_id: eu.id,
        cnj_id: p.id,
        cnj_hash: p.hash,
        numero_processo: p.numeroProcesso,
        numero_processo_limpo: p.numeroProcessoLimpo,
        tribunal: p.tribunal,
        orgao: p.orgao,
        classe: p.classe,
        tipo: p.tipo,
        disponibilizacao: p.disponibilizacao,
        partes: p.partes,
        advogados_intimados: p.advogados,
        link: p.link,
        teor: p.teor
      }));

      const { data, error } = await supabase
        .from("publicacoes")
        .upsert(linhas, { onConflict: "advogado_id,cnj_id", ignoreDuplicates: true })
        .select("id");

      if (error) throw new Error(traduzirErro(error.message));

      return { encontradas: itens.length, novas: data?.length ?? 0, truncado };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chavePublicacoes })
  });
}

/** "Já conferi", "não me interessa" — a decisão é sempre do advogado. */
export function useMarcarPublicacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: SituacaoPublicacao }) => {
      const { error } = await supabase.from("publicacoes").update({ situacao }).eq("id", id);
      if (error) throw new Error(traduzirErro(error.message));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chavePublicacoes })
  });
}

/**
 * Transforma uma publicação em processo cadastrado.
 *
 * Mora aqui, e não em `processos.ts`, para o import ser de mão única:
 * publicações conhecem processos, processos não conhecem publicações.
 *
 * O DataJud entra como enriquecimento de melhor esforço. Se ele não responder,
 * o processo é cadastrado com o que o DJEN já deu — um cadastro incompleto é
 * muito melhor do que uma importação que falha inteira.
 */
export function useImportarProcesso(advogadoId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: Publicacao) => {
      // O número é único no banco inteiro, então isto também pega o caso de o
      // processo já ter sido cadastrado à mão antes de a busca existir.
      const { data: existente, error: erroBusca } = await supabase
        .from("processos")
        .select("id")
        .eq("numero", p.numeroProcesso)
        .maybeSingle();
      if (erroBusca) throw new Error(traduzirErro(erroBusca.message));

      let processoId = existente?.id ?? null;
      const jaExistia = Boolean(processoId);

      if (!processoId) {
        const ficha = await buscarFicha(p.numeroProcessoLimpo, p.tribunal ?? "");

        const { data, error } = await supabase
          .from("processos")
          .insert({
            numero: p.numeroProcesso,
            // a publicação lista todos os destinatários; o cadastro guarda o
            // primeiro, e a lista inteira continua na publicação de origem
            parte: p.partes[0] ?? "Parte não informada",
            tipo: ficha?.assunto ?? p.classe,
            tribunal: p.tribunal,
            vara: ficha?.orgao ?? p.orgao,
            advogado_id: advogadoId,
            status: "Em andamento",
            valor_causa: 0,
            distribuicao: ficha?.ajuizamento ?? null,
            ultima_mov:
              ficha?.ultimoMovimento ??
              `${p.tipo ?? "Publicação"} em ${formatar(p.disponibilizacao)}`,
            origem: "djen"
          })
          .select("id")
          .single();

        if (error) throw new Error(traduzirErro(error.message));
        processoId = data.id;
      }

      const { error: erroVinculo } = await supabase
        .from("publicacoes")
        .update({ processo_id: processoId })
        .eq("id", p.id);
      if (erroVinculo) throw new Error(traduzirErro(erroVinculo.message));

      return { processoId, jaExistia };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaveProcessos });
      qc.invalidateQueries({ queryKey: chavePublicacoes });
    }
  });
}
