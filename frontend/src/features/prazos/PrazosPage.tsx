import { useState } from "react";
import { chavePrazos, usePrazos, useExcluirPrazo } from "@/lib/queries/prazos";
import { useAdvogados, primeiroNome } from "@/lib/queries/advogados";
import { useAoVivo } from "@/lib/queries/realtime";
import { diasAte, formatar, urgencia } from "@/lib/datas";
import { podeEditar, podeEscrever } from "@/lib/permissoes";
import { PrazoForm } from "./PrazoForm";
import type { Advogado, Prazo } from "@/types/dominio";

export function PrazosPage({ eu }: { eu: Advogado }) {
  const { data: prazos, isPending, error } = usePrazos();
  const { data: advogados } = useAdvogados();
  const excluir = useExcluirPrazo();
  const [emEdicao, setEmEdicao] = useState<Prazo | null | undefined>(undefined);
  const [filtroAdvogado, setFiltroAdvogado] = useState("todos");

  useAoVivo("prazos", chavePrazos);

  const porId = new Map((advogados ?? []).map((a) => [a.id, a]));

  const lista = (prazos ?? []).filter(
    (p) => filtroAdvogado === "todos" || p.advogadoId === filtroAdvogado
  );

  if (isPending) return <div className="empty-state">Carregando prazos…</div>;
  if (error) return <div className="empty-state">Não consegui carregar os prazos: {error.message}</div>;

  return (
    <>
      <div className="prazos-toolbar">
        <div className="tabs">
          <button
            className={filtroAdvogado === "todos" ? "tab active" : "tab"}
            onClick={() => setFiltroAdvogado("todos")}
          >
            Todos
          </button>
          {(advogados ?? []).map((a) => (
            <button
              key={a.id}
              className={filtroAdvogado === a.id ? "tab active" : "tab"}
              onClick={() => setFiltroAdvogado(a.id)}
            >
              <span className="dot" style={{ background: a.cor }} />
              {primeiroNome(a.nome)}
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          {/* Consulta não vê o botão — e a RLS também recusaria a escrita */}
          {podeEscrever(eu) && (
            <button className="btn-primary" onClick={() => setEmEdicao(null)}>
              + Novo prazo
            </button>
          )}
        </div>
      </div>

      <div className="prazos-list">
        {lista.length === 0 ? (
          <div className="empty-state">Nenhum prazo encontrado com esse filtro.</div>
        ) : (
          lista.map((p) => {
            const dono = p.advogadoId ? porId.get(p.advogadoId) : undefined;
            const u = urgencia(p.vencimento);
            const d = diasAte(p.vencimento);
            const meu = podeEditar(eu, p);

            return (
              <div className={`prazo-card ${u.cls}`} key={p.id}>
                <div className={`prazo-seal ${u.cls}`}>
                  <strong>{d < 0 ? "—" : d}</strong>
                  <small>{d < 0 ? "vencido" : d === 1 ? "dia" : "dias"}</small>
                </div>

                <div className="prazo-info">
                  <div className="prazo-info-top">
                    <span className="tag-type">{p.tipo}</span>
                    <span className="uf-tag">{p.estado}</span>
                    <span className={`badge badge-${u.cls} sm`}>{u.label}</span>
                  </div>
                  <strong>{p.descricao}</strong>
                  <small className="mono">{p.numeroProcesso}</small>
                  <small>{p.parteAutora}</small>
                </div>

                <div className="prazo-right">
                  <span
                    className="avatar xs"
                    style={{ background: dono?.cor ?? "#8B93A6" }}
                    title={dono?.nome ?? "Sem responsável"}
                  >
                    {dono?.iniciais ?? "—"}
                  </span>
                  <span className="prazo-date">{formatar(p.vencimento)}</span>

                  {meu && (
                    <>
                      <button
                        className="icon-btn tiny"
                        title="Editar"
                        onClick={() => setEmEdicao(p)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn tiny"
                        title="Remover"
                        onClick={() => {
                          if (confirm(`Remover o prazo "${p.descricao}"?`)) excluir.mutate(p.id);
                        }}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {excluir.error && <div className="login-error">{excluir.error.message}</div>}

      {emEdicao !== undefined && (
        <PrazoForm
          eu={eu}
          prazo={emEdicao}
          advogados={advogados ?? []}
          aoFechar={() => setEmEdicao(undefined)}
        />
      )}
    </>
  );
}
