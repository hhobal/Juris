import { useState, type FormEvent } from "react";
import { useSalvarTarefa } from "@/lib/queries/tarefas";
import { hoje } from "@/lib/datas";
import type { Advogado, ColunaTarefa, Prioridade, Tarefa } from "@/types/dominio";

const COLUNAS: { id: ColunaTarefa; titulo: string }[] = [
  { id: "fazer", titulo: "A Fazer" },
  { id: "andamento", titulo: "Em Andamento" },
  { id: "aguardando", titulo: "Aguardando" },
  { id: "concluido", titulo: "Concluído" }
];

const PRIORIDADES: { id: Prioridade; titulo: string }[] = [
  { id: "alta", titulo: "Alta" },
  { id: "media", titulo: "Média" },
  { id: "baixa", titulo: "Baixa" }
];

interface Props {
  eu: Advogado;
  /** null = criar uma nova */
  tarefa: Tarefa | null;
  /** valores iniciais ao criar — usado pelo "+ Criar tarefa" da tela de processo */
  prefill?: Partial<Tarefa>;
  aoFechar: () => void;
}

export function TarefaForm({ eu, tarefa, prefill, aoFechar }: Props) {
  const salvar = useSalvarTarefa();
  const editando = tarefa !== null;
  const base = tarefa ?? prefill;

  const [form, setForm] = useState({
    titulo: base?.titulo ?? "",
    descricao: base?.descricao ?? "",
    processoNumero: base?.processoNumero ?? "",
    advogadoId: base?.advogadoId ?? eu.id,
    prioridade: base?.prioridade ?? ("media" as Prioridade),
    coluna: base?.coluna ?? ("fazer" as ColunaTarefa),
    prazo: base?.prazo ?? hoje()
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate({ ...form, ...(tarefa ? { id: tarefa.id } : {}) }, { onSuccess: aoFechar });
  }

  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editando ? "Editar tarefa" : "Nova tarefa"}</h2>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <form className="form-modal" onSubmit={aoEnviar}>
          <label>
            Título da tarefa
            <input
              value={form.titulo}
              onChange={(e) => campo("titulo", e.target.value)}
              placeholder="Ex: Elaborar contestação"
              required
            />
          </label>

          <label>
            Descrição / observações
            <textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => campo("descricao", e.target.value)}
              placeholder="Detalhes úteis para quem for executar a tarefa…"
            />
          </label>

          <label>
            Número do processo (opcional)
            <input
              className="mono"
              value={form.processoNumero}
              onChange={(e) => campo("processoNumero", e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
            />
          </label>

          <div className="form-row">
            <label>
              Prioridade
              <select
                value={form.prioridade}
                onChange={(e) => campo("prioridade", e.target.value as Prioridade)}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.id} value={p.id}>{p.titulo}</option>
                ))}
              </select>
            </label>
            <label>
              Situação
              <select
                value={form.coluna}
                onChange={(e) => campo("coluna", e.target.value as ColunaTarefa)}
              >
                {COLUNAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Prazo para concluir
            <input
              type="date"
              value={form.prazo ?? ""}
              onChange={(e) => campo("prazo", e.target.value)}
              required
            />
          </label>

          {salvar.error && <div className="login-error">{salvar.error.message}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar ao quadro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
