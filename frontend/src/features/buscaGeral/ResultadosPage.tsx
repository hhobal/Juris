import { Link, useSearchParams } from "react-router-dom";
import { useProcessos } from "@/lib/queries/processos";
import { usePrazos } from "@/lib/queries/prazos";
import { useTarefas } from "@/lib/queries/tarefas";
import { useAdvogados } from "@/lib/queries/advogados";
import { formatar, urgencia } from "@/lib/datas";
import { normalizar } from "@/lib/formato";

/**
 * Resultado da busca do cabeçalho.
 *
 * O app antigo tinha uma busca global que só olhava processos. Como as três
 * listas já estão em cache, olhar as três custa o mesmo e responde a pergunta
 * que a pessoa realmente faz: "onde está aquilo que eu vi semana passada?".
 */
export function ResultadosPage() {
  const [params] = useSearchParams();
  const termo = params.get("q") ?? "";
  const q = normalizar(termo);

  const { data: processos } = useProcessos();
  const { data: prazos } = usePrazos();
  const { data: tarefas } = useTarefas();
  const { data: advogados } = useAdvogados();

  const porId = new Map((advogados ?? []).map((a) => [a.id, a]));
  const casa = (...campos: (string | null)[]) =>
    q.length > 0 && campos.some((c) => normalizar(c).includes(q));

  const achouProcessos = (processos ?? []).filter((p) =>
    casa(p.numero, p.parte, p.tipo, p.fase, p.tribunal, p.vara, p.ultimaMov)
  );
  const achouPrazos = (prazos ?? []).filter((p) =>
    casa(p.numeroProcesso, p.parteAutora, p.descricao, p.tipo, p.estado)
  );
  const achouTarefas = (tarefas ?? []).filter((t) =>
    casa(t.titulo, t.descricao, t.processoNumero)
  );

  const total = achouProcessos.length + achouPrazos.length + achouTarefas.length;

  if (!termo.trim()) {
    return <div className="empty-state">Digite algo na busca do topo para procurar.</div>;
  }

  return (
    <>
      <div className="box">
        <div className="box-head">
          <h2>
            Resultados para “{termo}” <span className="count-chip">{total}</span>
          </h2>
        </div>
        {total === 0 && (
          <div className="empty-state">
            Nada encontrado em processos, prazos ou tarefas. A busca ignora acentos
            e maiúsculas, então “citacao” também acha “Citação”.
          </div>
        )}
      </div>

      {achouProcessos.length > 0 && (
        <div className="box">
          <div className="box-head">
            <h2>Processos <span className="count-chip">{achouProcessos.length}</span></h2>
            <Link className="link-btn" to="/processos">Abrir a tela →</Link>
          </div>
          <table>
            <thead>
              <tr><th>Nº do processo</th><th>Partes</th><th>Tipo</th><th>Responsável</th></tr>
            </thead>
            <tbody>
              {achouProcessos.map((p) => {
                const adv = p.advogadoId ? porId.get(p.advogadoId) : undefined;
                return (
                  <tr key={p.id}>
                    <td className="mono">{p.numero}</td>
                    <td>{p.parte}</td>
                    <td>{p.tipo ?? "—"}</td>
                    <td>{adv?.nome ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {achouPrazos.length > 0 && (
        <div className="box">
          <div className="box-head">
            <h2>Prazos <span className="count-chip">{achouPrazos.length}</span></h2>
            <Link className="link-btn" to="/prazos">Abrir a tela →</Link>
          </div>
          {achouPrazos.map((p) => {
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
          })}
        </div>
      )}

      {achouTarefas.length > 0 && (
        <div className="box">
          <div className="box-head">
            <h2>Tarefas <span className="count-chip">{achouTarefas.length}</span></h2>
            <Link className="link-btn" to="/tarefas">Abrir o quadro →</Link>
          </div>
          {achouTarefas.map((t) => (
            <div className="task-row" key={t.id}>
              <span className={`pill pill-${t.prioridade}`}>{t.titulo}</span>
              <div className="task-row-info">
                <strong>{t.titulo}</strong>
                <small>{t.processoNumero ?? t.descricao ?? "Sem processo vinculado"}</small>
              </div>
              <span className="task-row-date">{formatar(t.prazo)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
