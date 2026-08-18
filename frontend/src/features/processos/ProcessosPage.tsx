import { useMemo, useState } from "react";
import { chaveProcessos, useExcluirProcesso, useProcessos } from "@/lib/queries/processos";
import { useAdvogados, primeiroNome } from "@/lib/queries/advogados";
import { useAoVivo } from "@/lib/queries/realtime";
import { normalizar } from "@/lib/formato";
import { podeEscrever } from "@/lib/permissoes";
import { ProcessoDetalhe, classeStatus } from "./ProcessoDetalhe";
import { ProcessoForm } from "./ProcessoForm";
import { PrazoForm } from "@/features/prazos/PrazoForm";
import { TarefaForm } from "@/features/tarefas/TarefaForm";
import type { Advogado, Prazo, Processo, Tarefa } from "@/types/dominio";

/** Qual janela está aberta por cima da lista. */
type Painel =
  | { tipo: "detalhe"; processo: Processo }
  | { tipo: "form"; processo: Processo | null }
  | { tipo: "novoPrazo"; prefill: Partial<Prazo> }
  | { tipo: "novaTarefa"; prefill: Partial<Tarefa> }
  | null;

export function ProcessosPage({ eu }: { eu: Advogado }) {
  const { data: processos, isPending, error } = useProcessos();
  const { data: advogados } = useAdvogados();
  const excluir = useExcluirProcesso();

  const [busca, setBusca] = useState("");
  const [filtroAdv, setFiltroAdv] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [painel, setPainel] = useState<Painel>(null);

  useAoVivo("processos", chaveProcessos);

  const porId = new Map((advogados ?? []).map((a) => [a.id, a]));

  const lista = useMemo(() => {
    const q = normalizar(busca);
    return (processos ?? []).filter((p) => {
      if (filtroAdv !== "todos" && p.advogadoId !== filtroAdv) return false;
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (!q) return true;
      return (
        normalizar(p.numero).includes(q) ||
        normalizar(p.parte).includes(q) ||
        normalizar(p.tipo).includes(q) ||
        normalizar(p.fase).includes(q)
      );
    });
  }, [processos, busca, filtroAdv, filtroStatus]);

  if (isPending) return <div className="empty-state">Carregando processos…</div>;
  if (error) return <div className="empty-state">Não consegui carregar os processos: {error.message}</div>;

  return (
    <>
      <div className="box search-box">
        <h2>Buscar processos</h2>
        <div className="search-row">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Número do processo, parte envolvida ou assunto…"
          />
          <select value={filtroAdv} onChange={(e) => setFiltroAdv(e.target.value)}>
            <option value="todos">Todos os advogados</option>
            {(advogados ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Suspenso">Suspenso</option>
            <option value="Encerrado">Encerrado</option>
          </select>
        </div>
      </div>

      <div className="box">
        <div className="box-head">
          <h2>Resultados <span className="count-chip">{lista.length}</span></h2>
          {podeEscrever(eu) && (
            <button className="btn-primary" onClick={() => setPainel({ tipo: "form", processo: null })}>
              + Novo processo
            </button>
          )}
        </div>

        {excluir.error && <div className="login-error">{excluir.error.message}</div>}

        {lista.length === 0 ? (
          <div className="empty-state">
            {processos?.length === 0
              ? "Nenhum processo cadastrado ainda."
              : "Nenhum processo encontrado para essa busca."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nº do processo</th><th>Partes</th><th>Tipo</th>
                <th>Fase</th><th>Advogado</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const adv = p.advogadoId ? porId.get(p.advogadoId) : undefined;
                return (
                  <tr
                    className="row-click"
                    key={p.id}
                    onClick={() => setPainel({ tipo: "detalhe", processo: p })}
                  >
                    <td className="mono">{p.numero}</td>
                    <td>{p.parte}</td>
                    <td>{p.tipo ?? "—"}</td>
                    <td>{p.fase ?? "—"}</td>
                    <td>
                      <span className="avatar xs" style={{ background: adv?.cor ?? "#8B93A6" }}>
                        {adv?.iniciais ?? "—"}
                      </span>{" "}
                      {adv ? primeiroNome(adv.nome) : "—"}
                    </td>
                    <td>
                      <span className={`status-tag status-${classeStatus(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="chevron">›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {painel?.tipo === "detalhe" && (
        <ProcessoDetalhe
          eu={eu}
          processo={painel.processo}
          responsavel={painel.processo.advogadoId ? porId.get(painel.processo.advogadoId) : undefined}
          aoFechar={() => setPainel(null)}
          aoEditar={() => setPainel({ tipo: "form", processo: painel.processo })}
          aoExcluir={() => {
            if (confirm(`Remover o processo ${painel.processo.numero}?`)) {
              excluir.mutate(painel.processo.id);
              setPainel(null);
            }
          }}
          aoCriarPrazo={() =>
            setPainel({
              tipo: "novoPrazo",
              prefill: {
                numeroProcesso: painel.processo.numero,
                // "Empresa x Fulano" -> parte autora é o que vem antes do "x"
                parteAutora: painel.processo.parte.split(/\s+x\s+/i)[0]?.trim() ?? "",
                advogadoId: painel.processo.advogadoId
              }
            })
          }
          aoCriarTarefa={() =>
            setPainel({
              tipo: "novaTarefa",
              prefill: {
                processoNumero: painel.processo.numero,
                advogadoId: painel.processo.advogadoId
              }
            })
          }
        />
      )}

      {painel?.tipo === "form" && (
        <ProcessoForm
          eu={eu}
          processo={painel.processo}
          advogados={advogados ?? []}
          aoFechar={() => setPainel(null)}
        />
      )}

      {painel?.tipo === "novoPrazo" && (
        <PrazoForm
          eu={eu}
          prazo={null}
          prefill={painel.prefill}
          advogados={advogados ?? []}
          aoFechar={() => setPainel(null)}
        />
      )}

      {painel?.tipo === "novaTarefa" && (
        <TarefaForm
          eu={eu}
          tarefa={null}
          prefill={painel.prefill}
          advogados={advogados ?? []}
          aoFechar={() => setPainel(null)}
        />
      )}
    </>
  );
}
