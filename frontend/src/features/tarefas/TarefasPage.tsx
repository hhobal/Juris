import { useState, type DragEvent } from "react";
import {
  chaveTarefas,
  useExcluirTarefa,
  useMoverTarefa,
  useTarefas
} from "@/lib/queries/tarefas";
import { useAoVivo } from "@/lib/queries/realtime";
import { formatar, urgencia } from "@/lib/datas";
import { TarefaForm } from "./TarefaForm";
import type { Advogado, ColunaTarefa, Tarefa } from "@/types/dominio";

const COLUNAS: { id: ColunaTarefa; titulo: string }[] = [
  { id: "fazer", titulo: "A Fazer" },
  { id: "andamento", titulo: "Em Andamento" },
  { id: "aguardando", titulo: "Aguardando" },
  { id: "concluido", titulo: "Concluído" }
];

const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa"
};

export function TarefasPage({ eu }: { eu: Advogado }) {
  const { data: tarefas, isPending, error } = useTarefas();
  const mover = useMoverTarefa();
  const excluir = useExcluirTarefa();

  const [emEdicao, setEmEdicao] = useState<Tarefa | null | undefined>(undefined);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<ColunaTarefa | null>(null);

  useAoVivo("tarefas", chaveTarefas);

  function aoSoltar(e: DragEvent, coluna: ColunaTarefa) {
    e.preventDefault();
    setAlvo(null);
    const id = arrastando;
    setArrastando(null);
    if (!id) return;
    const tarefa = (tarefas ?? []).find((t) => t.id === id);
    if (!tarefa || tarefa.coluna === coluna) return;
    mover.mutate({ id, coluna });
  }

  if (isPending) return <div className="empty-state">Carregando o quadro…</div>;
  if (error) return <div className="empty-state">Não consegui carregar as tarefas: {error.message}</div>;

  const falha = mover.error ?? excluir.error;

  return (
    <>
      <div className="kanban-toolbar">
        <button className="btn-primary" onClick={() => setEmEdicao(null)}>
          + Nova tarefa
        </button>
      </div>

      {falha && <div className="login-error">{falha.message}</div>}

      <div className="kanban-board">
        {COLUNAS.map((col) => {
          const itens = (tarefas ?? []).filter((t) => t.coluna === col.id);

          return (
            <div className="kanban-col" key={col.id}>
              <div className="kanban-col-head">
                <h3>{col.titulo}</h3>
                <span className="count-chip">{itens.length}</span>
              </div>

              <div
                className={alvo === col.id ? "kanban-dropzone drag-over" : "kanban-dropzone"}
                onDragOver={(e) => {
                  e.preventDefault();
                  setAlvo(col.id);
                }}
                onDragLeave={() => setAlvo((atual) => (atual === col.id ? null : atual))}
                onDrop={(e) => aoSoltar(e, col.id)}
              >
                {itens.map((t) => {
                  const u = t.prazo ? urgencia(t.prazo) : null;

                  return (
                    <div
                      key={t.id}
                      className={arrastando === t.id ? "kcard dragging" : "kcard"}
                      draggable
                      onDragStart={() => setArrastando(t.id)}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
                    >
                      <div className="kcard-top">
                        <span className={`pill pill-${t.prioridade}`}>
                          {PRIORIDADE_LABEL[t.prioridade]}
                        </span>
                        <div className="kcard-actions">
                          <button
                            className="icon-btn tiny"
                            title="Editar"
                            onClick={() => setEmEdicao(t)}
                          >
                            ✎
                          </button>
                          <button
                            className="icon-btn tiny"
                            title="Remover"
                            onClick={() => {
                              if (confirm(`Remover a tarefa "${t.titulo}"?`)) excluir.mutate(t.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <strong className="kcard-title">{t.titulo}</strong>
                      {t.descricao && <p className="kcard-desc">{t.descricao}</p>}
                      {t.processoNumero && (
                        <small className="kcard-proc mono">{t.processoNumero}</small>
                      )}

                      <div className="kcard-foot">
                        {u && <span className={`badge badge-${u.cls} sm`}>{u.label}</span>}
                        <span className="kcard-date">{formatar(t.prazo)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {emEdicao !== undefined && (
        <TarefaForm eu={eu} tarefa={emEdicao} aoFechar={() => setEmEdicao(undefined)} />
      )}
    </>
  );
}
