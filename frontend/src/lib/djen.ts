/**
 * Cliente da API Comunica / DJEN do CNJ.
 *
 * O Diário de Justiça Eletrônico Nacional concentra as intimações e publicações
 * de todos os tribunais do país. É público: não tem login, não tem chave, não
 * tem certificado. O número da OAB é só um filtro de busca sobre dado público —
 * consultar aqui não toca em nada do PJe/Projudi onde o advogado faz login.
 *
 * Chamamos direto do navegador porque a API manda `Access-Control-Allow-Origin: *`
 * (verificado em 31/08/2026). Se um dia isso mudar, o conserto é mover esta
 * função para uma Edge Function — a assinatura de `buscarPublicacoes` continua
 * a mesma, e nada na tela precisa mudar.
 *
 * Ver docs/plano-busca-de-processos.md.
 */

const BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

/** Uma publicação do diário, já traduzida para o vocabulário do app. */
export interface PublicacaoDjen {
  /** id da comunicação no CNJ — serve de chave para não importar duas vezes */
  id: number;
  /** hash da comunicação, a outra metade da deduplicação */
  hash: string | null;
  /** "0017898-57.2008.8.16.0185" */
  numeroProcesso: string;
  /** só dígitos — é o formato que o DataJud exige */
  numeroProcessoLimpo: string;
  tribunal: string;
  orgao: string;
  classe: string | null;
  /** "Intimação", "Citação", "Sentença"… */
  tipo: string;
  /** data pura "AAAA-MM-DD" — é a disponibilização, NÃO o vencimento do prazo */
  disponibilizacao: string;
  partes: string[];
  advogados: string[];
  /** link para o documento no sistema do tribunal */
  link: string | null;
  /** o teor da publicação, já sem HTML */
  teor: string;
}

export interface Consulta {
  numeroOab: string;
  ufOab: string;
  /** data pura "AAAA-MM-DD" */
  de: string;
  ate: string;
  /** filtro opcional de siglas; vazio = todos os tribunais */
  tribunais?: string[];
}

export interface Resultado {
  itens: PublicacaoDjen[];
  /** true quando o teto de páginas foi atingido — pode haver mais lá fora */
  truncado: boolean;
}

/**
 * O `count` da resposta NÃO é o total de resultados. Medido em 31/08/2026, na
 * mesma consulta, variando só o tamanho da página:
 *
 *   itensPorPagina=5   -> count 10000
 *   itensPorPagina=20  -> count 93435
 *   itensPorPagina=100 -> count 100
 *   itensPorPagina=200 -> count 200
 *
 * Ora é um teto, ora é o tamanho da página, ora parece o total de verdade. Não
 * dá para confiar nesse número para nada. Quem quiser saber se acabou tem que
 * paginar até vir uma página incompleta — que é o que esta função faz.
 *
 * (Medido junto: itensPorPagina abaixo de 5 é ignorado; o mínimo é 5.)
 */
const POR_PAGINA = 100;

/** 20 páginas = 2000 publicações. Mais que isso, o período é grande demais. */
const MAX_PAGINAS = 20;

export async function buscarPublicacoes(c: Consulta): Promise<Resultado> {
  const itens: PublicacaoDjen[] = [];
  let truncado = false;

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const lote = await buscarPagina(c, pagina);
    itens.push(...lote);

    // página incompleta significa que acabou
    if (lote.length < POR_PAGINA) break;
    if (pagina === MAX_PAGINAS) truncado = true;
  }

  // A API aceita uma sigla por vez em siglaTribunal. Como sem o filtro ela já
  // devolve todos, sai mais barato filtrar aqui do que fazer uma requisição
  // por tribunal.
  if (c.tribunais?.length) {
    const querido = new Set(c.tribunais.map((t) => t.toUpperCase()));
    return { itens: itens.filter((p) => querido.has(p.tribunal.toUpperCase())), truncado };
  }

  return { itens, truncado };
}

async function buscarPagina(c: Consulta, pagina: number): Promise<PublicacaoDjen[]> {
  const params = new URLSearchParams({
    numeroOab: c.numeroOab,
    ufOab: c.ufOab,
    dataDisponibilizacaoInicio: c.de,
    dataDisponibilizacaoFim: c.ate,
    itensPorPagina: String(POR_PAGINA),
    pagina: String(pagina)
  });

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}?${params}`);
  } catch {
    // fetch só rejeita por rede/CORS — a API fora do ar cai aqui também
    throw new Error(
      "Não consegui falar com o DJEN. Verifique sua conexão; se persistir, a API do CNJ pode estar fora do ar."
    );
  }

  if (!resposta.ok) {
    throw new Error(`O DJEN respondeu ${resposta.status}. Tente de novo em alguns minutos.`);
  }

  const json = await resposta.json();

  if (json?.status && json.status !== "success") {
    throw new Error(json.message || "O DJEN recusou a consulta.");
  }

  const brutos: unknown[] = Array.isArray(json?.items) ? json.items : [];
  return brutos.map(paraPublicacaoDjen);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function paraPublicacaoDjen(bruto: any): PublicacaoDjen {
  const numeroLimpo: string = bruto?.numero_processo ?? "";

  return {
    id: bruto?.id ?? 0,
    hash: bruto?.hash ?? null,
    numeroProcesso: bruto?.numeroprocessocommascara || numeroLimpo || "—",
    numeroProcessoLimpo: numeroLimpo,
    tribunal: bruto?.siglaTribunal ?? "—",
    orgao: bruto?.nomeOrgao ?? "—",
    classe: bruto?.nomeClasse ?? null,
    tipo: bruto?.tipoComunicacao ?? bruto?.tipoDocumento ?? "Publicação",
    disponibilizacao: (bruto?.data_disponibilizacao ?? "").slice(0, 10),
    partes: Array.isArray(bruto?.destinatarios)
      ? bruto.destinatarios.map((d: any) => d?.nome).filter(Boolean)
      : [],
    advogados: Array.isArray(bruto?.destinatarioadvogados)
      ? bruto.destinatarioadvogados
          .map((d: any) => {
            const a = d?.advogado;
            if (!a?.nome) return null;
            return a.numero_oab ? `${a.nome} (OAB/${a.uf_oab} ${a.numero_oab})` : a.nome;
          })
          .filter(Boolean)
      : [],
    link: bruto?.link || null,
    teor: semHtml(bruto?.texto ?? "")
  };
}

/**
 * O `texto` vem como HTML de tabela, com entidades (`&aacute;`, `&ordf;`).
 *
 * O DOMParser resolve os dois de uma vez e é seguro: um documento criado assim
 * não executa script nem carrega imagem. O resultado sai como texto puro, para
 * a tela nunca precisar de dangerouslySetInnerHTML.
 */
function semHtml(html: string): string {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}
