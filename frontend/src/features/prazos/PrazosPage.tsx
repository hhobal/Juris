import { useState } from "react";
import { chavePrazos, usePrazos, useExcluirPrazo, useConfirmarPrazo } from "@/lib/queries/prazos";
import { useAoVivo } from "@/lib/queries/realtime";
import { diasAte, formatar, urgencia } from "@/lib/datas";
import { PrazoForm } from "./PrazoForm";
import type { Advogado, Prazo } from "@/types/dominio";

export function PrazosPage({ eu }: { eu: Advogado }) {
  const { data: prazos, isPending, error } = usePrazos();
  const excluir = useExcluirPrazo();
  const confirmar = useConfirmarPrazo();
  const [emEdicao, setEmEdicao] = useState<Prazo | null | undefined>(undefined);

  useAoVivo("prazos", chavePrazos);

  if (isPending) return <div className="empty-state">Carregando prazos…</div>;
  if (error) return <div className="empty-state">Não consegui carregar os prazos: {error.message}</div>;

  return (
    <>
      <div className="prazos-toolbar">
        <div className="toolbar-right">
          <button className="btn-primary" onClick={() => setEmEdicao(null)}>
            + Novo prazo
          </button>
        </div>
      </div>

      <div className="prazos-list">
        {prazos?.length === 0 ? (
          <div className="empty-state">Nenhum prazo cadastrado ainda.</div>
        ) : (
          prazos!.map((p) => {
            const u = urgencia(p.vencimento);
            const d = diasAte(p.vencimento);

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
                    {p.advogadoId !== eu.id && (
                      <span className="status-tag status-wait" title="Prazo de um processo que um colega compartilhou com você">
                        De um colega
                      </span>
                    )}
                    {!p.confirmado && (
                      <span className="status-tag status-wait" title="Data calculada pelo sistema, ainda não conferida">
                        A conferir
                      </span>
                    )}
                  </div>
                  <strong>{p.descricao}</strong>
                  <small className="mono">{p.numeroProcesso}</small>
                  <small>{p.parteAutora}</small>
                </div>

                <div className="prazo-right">
                  <span className="prazo-date">{formatar(p.vencimento)}</span>
                  {!p.confirmado && (
                    <button
                      className="icon-btn tiny"
                      title="Conferi a intimação: a data está certa"
                      onClick={() => confirmar.mutate(p.id)}
                      disabled={confirmar.isPending}
                    >
                      ✓
                    </button>
                  )}
                  <button className="icon-btn tiny" title="Editar" onClick={() => setEmEdicao(p)}>
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
                </div>
              </div>
            );
          })
        )}
      </div>

      {excluir.error && <div className="login-error">{excluir.error.message}</div>}

      {emEdicao !== undefined && (
        <PrazoForm eu={eu} prazo={emEdicao} aoFechar={() => setEmEdicao(undefined)} />
      )}
    </>
  );
}
