import { useState } from "react";
import { useEquipe } from "@/lib/queries/equipe";
import { useProcessos } from "@/lib/queries/processos";
import { useTarefas } from "@/lib/queries/tarefas";
import { usePrazos } from "@/lib/queries/prazos";
import { formatar } from "@/lib/datas";
import { ehAdmin, rotuloPapel } from "@/lib/permissoes";
import { AdvogadoForm } from "./AdvogadoForm";
import type { Advogado } from "@/types/dominio";

export function EquipePage({ eu }: { eu: Advogado }) {
  const { data: equipe, isPending, error } = useEquipe();
  const { data: processos } = useProcessos();
  const { data: tarefas } = useTarefas();
  const { data: prazos } = usePrazos();
  const [emEdicao, setEmEdicao] = useState<Advogado | null | undefined>(undefined);

  const souAdmin = ehAdmin(eu);

  if (isPending) return <div className="empty-state">Carregando a equipe…</div>;
  if (error) return <div className="empty-state">Não consegui carregar a equipe: {error.message}</div>;

  const semLogin = (equipe ?? []).filter((a) => a.ativo && !a.temLogin);

  return (
    <>
      <div className="kanban-toolbar">
        <div className="tabs">
          <span className="muted" style={{ fontSize: 13 }}>
            {(equipe ?? []).filter((a) => a.ativo).length} pessoa(s) com acesso
          </span>
        </div>
        {souAdmin && (
          <button className="btn-primary" onClick={() => setEmEdicao(null)}>
            + Cadastrar advogado
          </button>
        )}
      </div>

      {/* Cadastro sem login é o erro mais comum do fluxo de dois passos.
          Melhor avisar do que deixar a pessoa descobrir tentando entrar. */}
      {souAdmin && semLogin.length > 0 && (
        <div className="box" style={{ borderColor: "var(--gold)" }}>
          <div className="box-head">
            <h2>Falta criar o login</h2>
            <span className="status-tag status-wait">{semLogin.length} pendente(s)</span>
          </div>
          <p className="muted">
            {semLogin.map((a) => a.nome).join(", ")} {semLogin.length === 1 ? "está cadastrado" : "estão cadastrados"}{" "}
            mas ainda não {semLogin.length === 1 ? "consegue" : "conseguem"} entrar. Crie o login em{" "}
            <strong>Authentication → Users → Add user</strong> no painel do Supabase, com o mesmo
            e-mail e <strong>Auto Confirm User</strong> marcado.
          </p>
        </div>
      )}

      <div className="cards cards-3">
        {(equipe ?? []).map((a) => {
          const processosAtivos = (processos ?? []).filter(
            (p) => p.advogadoId === a.id && p.status === "Em andamento"
          ).length;
          const tarefasPend = (tarefas ?? []).filter(
            (t) => t.advogadoId === a.id && t.coluna !== "concluido"
          ).length;
          const prox = (prazos ?? [])
            .filter((p) => p.advogadoId === a.id)
            .sort((x, y) => x.vencimento.localeCompare(y.vencimento))[0];

          const podeEditarEste = souAdmin || a.id === eu.id;

          return (
            <div
              className="box lawyer-card"
              key={a.id}
              style={a.ativo ? undefined : { opacity: 0.55 }}
            >
              <span className="avatar lg" style={{ background: a.cor }}>{a.iniciais}</span>
              <h2>{a.nome}</h2>
              <small>
                {a.cargo ?? "—"}{a.oab ? ` · OAB ${a.oab}` : ""}
              </small>

              <div className="prazo-info-top" style={{ justifyContent: "center", marginTop: 10 }}>
                <span className={`status-tag status-${a.papel === "admin" ? "ok" : a.papel === "consulta" ? "wait" : "closed"}`}>
                  {rotuloPapel(a.papel)}
                </span>
                {!a.ativo && <span className="status-tag status-closed">Desativado</span>}
                {a.ativo && !a.temLogin && <span className="status-tag status-wait">Sem login</span>}
              </div>

              <div className="lawyer-stats">
                <div><strong>{processosAtivos}</strong><span>processos ativos</span></div>
                <div><strong>{tarefasPend}</strong><span>tarefas pendentes</span></div>
              </div>

              {prox && (
                <div className="lawyer-next">
                  Próximo prazo: <strong>{formatar(prox.vencimento)}</strong> — {prox.descricao}
                </div>
              )}

              {podeEditarEste && (
                <div className="modal-actions" style={{ marginTop: 14 }}>
                  <button className="btn-secondary" onClick={() => setEmEdicao(a)}>
                    {a.id === eu.id && !souAdmin ? "Editar meu cadastro" : "Editar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!souAdmin && (
        <p className="muted" style={{ marginTop: 20 }}>
          Cadastrar, promover e desativar pessoas é função de administrador. Você pode
          corrigir o seu próprio cadastro.
        </p>
      )}

      {emEdicao !== undefined && (
        <AdvogadoForm eu={eu} advogado={emEdicao} aoFechar={() => setEmEdicao(undefined)} />
      )}
    </>
  );
}
