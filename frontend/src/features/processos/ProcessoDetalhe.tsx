import { usePrazos } from "@/lib/queries/prazos";
import { useTarefas } from "@/lib/queries/tarefas";
import { formatar, urgencia } from "@/lib/datas";
import { moeda } from "@/lib/formato";
import type { Advogado, Processo } from "@/types/dominio";
import { Modal } from "@/app/Modal";

interface Props {
  eu: Advogado;
  processo: Processo;
  aoFechar: () => void;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoCriarPrazo: () => void;
  aoCriarTarefa: () => void;
  aoCompartilhar: () => void;
}

export function ProcessoDetalhe({
  eu, processo: p, aoFechar, aoEditar, aoExcluir, aoCriarPrazo, aoCriarTarefa, aoCompartilhar
}: Props) {
  // Se o processo não é seu, ele chegou aqui por compartilhamento — a RLS não
  // deixaria você ler de outro jeito. Leitura sim, escrita não.
  const meu = p.advogadoId === eu.id;
  // Já estão em cache — as duas telas carregam essas listas de qualquer forma.
  const { data: prazos } = usePrazos();
  const { data: tarefas } = useTarefas();

  const prazosDoProc = (prazos ?? []).filter((x) => x.numeroProcesso === p.numero);
  const tarefasDoProc = (tarefas ?? []).filter((x) => x.processoNumero === p.numero);

  return (
    <Modal aoFechar={aoFechar}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {p.tipo ?? "Processo"}{p.tribunal ? ` · ${p.tribunal}` : ""}
            </div>
            <h2 className="mono">{p.numero}</h2>
          </div>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <p className="modal-parties">{p.parte}</p>

        {!meu && (
          <p className="muted">
            <span className="status-tag status-wait">Compartilhado com você</span>{" "}
            Um colega liberou este processo para você acompanhar. Quem edita, apaga e
            cria prazos aqui é quem é dono dele.
          </p>
        )}

        <div className="detail-grid">
          <div><small>Vara</small><strong>{p.vara ?? "—"}</strong></div>
          <div>
            <small>Status</small>
            <strong>
              <span className={`status-tag status-${classeStatus(p.status)}`}>{p.status}</span>
            </strong>
          </div>
          <div><small>Fase atual</small><strong>{p.fase ?? "—"}</strong></div>
          <div><small>Valor da causa</small><strong>{moeda(p.valorCausa)}</strong></div>
          <div><small>Distribuição</small><strong>{formatar(p.distribuicao)}</strong></div>
        </div>

        {p.ultimaMov && (
          <div className="detail-block">
            <small>Última movimentação</small>
            <p>{p.ultimaMov}</p>
          </div>
        )}

        {prazosDoProc.length > 0 && (
          <div className="detail-block">
            <small>Prazos vinculados</small>
            {prazosDoProc.map((pr) => {
              const u = urgencia(pr.vencimento);
              return (
                <div className="task-row" key={pr.id}>
                  <span className={`badge badge-${u.cls}`}>{u.label}</span>
                  <div className="task-row-info">
                    <strong>{pr.descricao}</strong>
                    <small>{pr.parteAutora} · {pr.estado}</small>
                  </div>
                  <span className="task-row-date">{formatar(pr.vencimento)}</span>
                </div>
              );
            })}
          </div>
        )}

        {tarefasDoProc.length > 0 && (
          <div className="detail-block">
            <small>Tarefas vinculadas</small>
            {tarefasDoProc.map((t) => (
              <div className="task-row" key={t.id}>
                <span className={`pill pill-${t.prioridade}`}>{t.titulo}</span>
                <div className="task-row-info">
                  <strong>{t.titulo}</strong>
                  <small>{t.descricao ?? "Sem descrição"}</small>
                </div>
                <span className="task-row-date">{formatar(t.prazo)}</span>
              </div>
            ))}
          </div>
        )}

        {meu && (
          <div className="modal-actions" style={{ flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={aoEditar}>Editar</button>
            <button className="btn-secondary" onClick={aoExcluir}>Excluir</button>
            <button className="btn-secondary" onClick={aoCriarTarefa}>+ Criar tarefa</button>
            <button className="btn-secondary" onClick={aoCriarPrazo}>+ Criar prazo</button>
            <button className="btn-secondary" onClick={aoCompartilhar}>Compartilhar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function classeStatus(s: string): string {
  return s === "Em andamento" ? "ok" : s === "Suspenso" ? "wait" : "closed";
}
