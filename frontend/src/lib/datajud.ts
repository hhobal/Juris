/**
 * Cliente da API Pública do DataJud (CNJ).
 *
 * Complementa o DJEN. O DJEN diz QUAIS processos são do advogado (porque tem
 * o nome das partes e dos advogados); o DataJud diz TUDO SOBRE um processo
 * cujo número já se conhece — classe, assunto, órgão, ajuizamento, movimentos.
 * Nenhum dos dois substitui o outro.
 *
 * Por baixo é um Elasticsearch, daí a query ter esse formato. O índice muda
 * por tribunal: api_publica_tjpr, api_publica_trt9, api_publica_tjsp…
 *
 * A chave é publicada pelo próprio CNJ na documentação — não é segredo, é
 * credencial de acesso público. Fica aqui porque esta chamada roda no
 * navegador; quando a varredura da Etapa 5 for para o servidor, ela vai para
 * um secret junto.
 *
 * Ver docs/plano-busca-de-processos.md.
 */

const BASE = "https://api-publica.datajud.cnj.jus.br";
const CHAVE = "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

/** O que o DataJud sabe de um processo, no vocabulário do app. */
export interface Ficha {
  classe: string | null;
  assunto: string | null;
  orgao: string | null;
  /** data pura "AAAA-MM-DD" */
  ajuizamento: string | null;
  /** nome do movimento mais recente, com a data */
  ultimoMovimento: string | null;
  /** "G1", "G2"… */
  grau: string | null;
}

/**
 * Busca a ficha de um processo. Devolve null quando não achou.
 *
 * Nunca lança: o enriquecimento é um bônus, não um requisito. Se o DataJud
 * estiver fora do ar, o processo é importado só com o que o DJEN já deu —
 * é melhor um cadastro incompleto do que uma importação que falha inteira.
 */
export async function buscarFicha(
  numeroLimpo: string,
  tribunal: string
): Promise<Ficha | null> {
  if (!numeroLimpo || !tribunal) return null;

  const indice = `api_publica_${tribunal.toLowerCase()}`;

  try {
    const resposta = await fetch(`${BASE}/${indice}/_search`, {
      method: "POST",
      headers: { Authorization: CHAVE, "Content-Type": "application/json" },
      body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numeroLimpo } } })
    });

    if (!resposta.ok) return null;

    const json = await resposta.json();
    const fonte = json?.hits?.hits?.[0]?._source;
    if (!fonte) return null;

    return {
      classe: fonte?.classe?.nome ?? null,
      assunto: fonte?.assuntos?.[0]?.nome ?? null,
      orgao: fonte?.orgaoJulgador?.nome ?? null,
      ajuizamento: dataDoCarimbo(fonte?.dataAjuizamento),
      ultimoMovimento: ultimoMovimento(fonte?.movimentos),
      grau: fonte?.grau ?? null
    };
  } catch {
    return null;
  }
}

/** "20081128000000" -> "2008-11-28" */
function dataDoCarimbo(bruto: unknown): string | null {
  const s = String(bruto ?? "");
  if (s.length < 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * O array de movimentos não vem ordenado — o do teste veio com uma
 * redistribuição de 2021 no meio de eventos de 2026. Ordenar é obrigatório.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function ultimoMovimento(movimentos: unknown): string | null {
  if (!Array.isArray(movimentos) || movimentos.length === 0) return null;

  const ultimo = [...movimentos]
    .filter((m: any) => m?.dataHora && m?.nome)
    .sort((a: any, b: any) => String(b.dataHora).localeCompare(String(a.dataHora)))[0] as any;

  if (!ultimo) return null;

  const dia = String(ultimo.dataHora).slice(0, 10).split("-").reverse().join("/");
  return `${ultimo.nome} (${dia})`;
}
