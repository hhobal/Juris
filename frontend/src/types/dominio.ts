/**
 * Os tipos que o app usa.
 *
 * De propósito não são os tipos gerados do banco: aqui é camelCase, é o
 * vocabulário do escritório, e não muda se uma coluna for renomeada. A
 * tradução entre um e outro mora em `lib/queries/`.
 */

export interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export type Papel = "admin" | "advogado" | "consulta";

export interface Advogado {
  id: string;
  nome: string;
  email: string;
  oab: string | null;
  cargo: string | null;
  cor: string;
  iniciais: string;
  papel: Papel;
  ativo: boolean;
  /** Perfil sem login criado no Auth ainda: cadastrado, mas sem conseguir entrar. */
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
  criadoPor: string | null;
  atualizadoPor: string | null;
}

/** O que é preciso saber para montar um prazo novo. */
export type NovoPrazo = Omit<Prazo, "id" | "criadoPor" | "atualizadoPor">;
