/**
 * Os tipos que o app usa.
 *
 * De propósito não são os tipos gerados do banco: aqui é camelCase, é o
 * vocabulário do escritório, e não muda se uma coluna for renomeada. A
 * tradução entre um e outro mora em `lib/queries/`.
 */

export interface Advogado {
  id: string;
  nome: string;
  email: string;
  /** Só dígitos, sem pontos — é o formato que a API do CNJ exige em `numeroOab`. */
  oabNumero: string | null;
  /** Seccional em que o advogado é inscrito, duas letras — `ufOab` na API do CNJ.
   *  Não é o estado onde o processo corre. */
  oabUf: string | null;
  /** Siglas de tribunal a vigiar na busca automática. Vazio = todos. */
  tribunaisMonitorados: string[];
  cargo: string | null;
  cor: string;
  iniciais: string;
  ativo: boolean;
  /** Perfil sem login criado no Auth ainda — hoje só acontece se a conta foi
   *  removida do Auth por fora do app; o cadastro em si nasce pelo signup. */
  temLogin: boolean;
}

export type StatusProcesso = "Em andamento" | "Suspenso" | "Encerrado";

export interface Processo {
  /** Chave real. O número é único, mas pode ser corrigido — o id, não. */
  id: string;
  numero: string;
  parte: string;
  tipo: string | null;
  tribunal: string | null;
  vara: string | null;
  advogadoId: string | null;
  status: StatusProcesso;
  fase: string | null;
  valorCausa: number;
  /** data pura, "AAAA-MM-DD" — sem hora, para não escorregar de fuso */
  distribuicao: string | null;
  ultimaMov: string | null;
  /** "manual" se o advogado cadastrou, "djen" se veio de uma publicação */
  origem: "manual" | "djen";
}

/**
 * A liberação de leitura de um processo para um colega.
 *
 * A chave é o e-mail, não o id de um advogado: dá para compartilhar com quem
 * ainda não tem conta, e o acesso passa a valer sozinho no dia em que essa
 * pessoa se cadastrar.
 */
export interface Compartilhamento {
  id: string;
  processoId: string;
  donoId: string;
  emailConvidado: string;
}

export type ColunaTarefa = "fazer" | "andamento" | "aguardando" | "concluido";
export type Prioridade = "alta" | "media" | "baixa";

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  processoNumero: string | null;
  advogadoId: string | null;
  coluna: ColunaTarefa;
  prioridade: Prioridade;
  /** data pura, "AAAA-MM-DD" */
  prazo: string | null;
}

export type TipoPrazo = "Prazo processual" | "Audiência" | "Recurso";

export interface Prazo {
  id: string;
  numeroProcesso: string;
  parteAutora: string;
  estado: string;
  descricao: string;
  tipo: TipoPrazo;
  advogadoId: string | null;
  /** data pura, "AAAA-MM-DD" */
  vencimento: string;
  /** "manual" se o advogado digitou a data, "djen" se o sistema calculou */
  origem: "manual" | "djen";
  /**
   * Falso enquanto um prazo calculado não foi conferido. O cálculo não conhece
   * feriado municipal nem portaria de suspensão — ver lib/prazoLegal.ts.
   */
  confirmado: boolean;
  /** tamanho assumido no cálculo, para dar para refazer a conta */
  diasUteis: number | null;
  /** a publicação que originou o prazo, quando veio do diário */
  publicacaoId: string | null;
  criadoPor: string | null;
  atualizadoPor: string | null;
}

/** O que é preciso saber para montar um prazo novo. */
export type NovoPrazo = Omit<Prazo, "id" | "criadoPor" | "atualizadoPor">;

/**
 * O advogado confere e decide. Nenhuma API sabe se ele já cumpriu o que a
 * intimação pedia — o DJEN publica o ato, não a resposta a ele.
 */
export type SituacaoPublicacao = "nova" | "conferida" | "ignorada";

/** Uma publicação do diário oficial, já guardada no banco. */
export interface Publicacao {
  id: string;
  /** id da comunicação no CNJ — é a chave da deduplicação */
  cnjId: number;
  numeroProcesso: string;
  /** só dígitos, para consultar o DataJud */
  numeroProcessoLimpo: string;
  tribunal: string | null;
  orgao: string | null;
  classe: string | null;
  tipo: string | null;
  /** data pura "AAAA-MM-DD". É a disponibilização no diário, NÃO o vencimento. */
  disponibilizacao: string;
  partes: string[];
  advogadosIntimados: string[];
  link: string | null;
  teor: string | null;
  situacao: SituacaoPublicacao;
  /** preenchido quando a publicação já virou processo cadastrado */
  processoId: string | null;
}
