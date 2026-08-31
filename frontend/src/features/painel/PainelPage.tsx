import { Link } from "react-router-dom";
import { usePrazos } from "@/lib/queries/prazos";
import { useTarefas } from "@/lib/queries/tarefas";
import { useProcessos } from "@/lib/queries/processos";
import { primeiroNome } from "@/lib/queries/advogados";
import { diasAte, formatar, urgencia } from "@/lib/datas";
import type { Advogado, Prazo, Tarefa } from "@/types/dominio";

const PRIORIDADE_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export function PainelPage({ eu }: { eu: Advogado }) {
  const { data: prazos, isPending: carregandoPrazos } = usePrazos();
  const { data: tarefas } = useTarefas();
  const { data: processos } = useProcessos();

  if (carregandoPrazos) return <div className="empty-state">Carregando o painel…</div>;

  const ativos = (processos ?? []).filter((p) => p.status === "Em andamento").length;
  const naSemana = (prazos ?? []).filter((p) => {
    const d = diasAte(p.vencimento);
    return d >= 0 && d <= 7;
  }).length;
  const pendentes = (tarefas ?? []).filter((t) => t.coluna !== "concluido").length;

  // Ordenar por string "AAAA-MM-DD" já dá ordem cronológica — nem precisa de Date.
  const proximosPrazos = [...(prazos ?? [])].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 4);

  const tarefasPendentes = (tarefas ?? [])
    .filter((t) => t.coluna !== "concluido")
    .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"))
    .slice(0, 4);

  const vencidos = (prazos ?? []).filter((p) => diasAte(p.vencimento) < 0).length;

  return (
    <>
      <div className="cards">
        <div className="card"><span>Processos ativos</span><strong>{ativos}</strong></div>
        <div className="card">
          <span>Prazos nos próx. 7 dias</span>
          <strong className={naSemana > 0 ? "danger" : ""}>{naSemana}</strong>
        </div>
        <div className="card"><span>Tarefas pendentes</span><strong>{pendentes}</strong></div>
      </div>

      {/* Prazo vencido é a pior coisa que pode acontecer neste sistema.
          Se houver algum, ele não fica escondido no meio de uma lista. */}
      {vencidos > 0 && (
        <div className="box" style={{ borderColor: "var(--red)" }}>
          <div className="box-head">
            <h2>{vencidos} prazo{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""}</h2>
            <Link className="link-btn" to="/prazos">Ver todos →</Link>
          </div>
          <p className="muted">
            Há {vencidos === 1 ? "um prazo que passou" : "prazos que passaram"} da data
            e {vencidos === 1 ? "continua" : "continuam"} no sistema. Vale conferir se
            já {vencidos === 1 ? "foi cumprido" : "foram cumpridos"}.
          </p>
        </div>
      )}

      <div className="grid grid-2">
        <div className="box">
          <div className="box-head">
            <h2>Próximos prazos</h2>
            <Link className="link-btn" to="/prazos">Ver todos →</Link>
          </div>
          {proximosPrazos.length ? proximosPrazos.map(LinhaPrazo) : (
            <div className="empty-state">Nenhum prazo cadastrado ainda.</div>
          )}
        </div>

        <div className="box">
          <div className="box-head">
            <h2>Tarefas pendentes</h2>
            <Link className="link-btn" to="/tarefas">Ver quadro →</Link>
          </div>
          {tarefasPendentes.length ? tarefasPendentes.map(LinhaTarefa) : (
            <div className="empty-state">
              Nenhuma tarefa pendente. Bom trabalho, {primeiroNome(eu.nome)}.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LinhaPrazo(p: Prazo) {
  const u = urgencia(p.vencimento);
  return (
    <div className="task-row" key={p.id}>
      <span className={`badge badge-${u.cls}`}>{u.label}</span>
      <div className="task-row-info">
        <strong>{p.descricao}</strong>
        <small>{p.parteAutora} · {p.numeroProcesso} — {p.estado}</small>
      </div>
      <span className="task-row-date">{formatar(p.vencimento)}</span>
    </div>
  );
}

function LinhaTarefa(t: Tarefa) {
  const u = t.prazo ? urgencia(t.prazo) : null;
  return (
    <div className="task-row" key={t.id}>
      {u && <span className={`badge badge-${u.cls}`}>{u.label}</span>}
      <div className="task-row-info">
        <strong>{t.titulo}</strong>
        <small>{t.processoNumero ?? t.descricao ?? "Sem processo vinculado"}</small>
      </div>
      <span className={`pill pill-${t.prioridade}`}>{PRIORIDADE_LABEL[t.prioridade]}</span>
    </div>
  );
}
