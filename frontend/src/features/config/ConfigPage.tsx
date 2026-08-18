import { useEmpresa } from "@/lib/queries/empresa";
import { rotuloPapel } from "@/lib/permissoes";
import type { Advogado, Papel } from "@/types/dominio";

const O_QUE_PODE: Record<Papel, string[]> = {
  admin: [
    "Ver e editar tudo do escritório",
    "Cadastrar, promover e desativar pessoas",
    "Alterar processos, prazos e tarefas de qualquer colega"
  ],
  advogado: [
    "Ver tudo do escritório",
    "Criar processos, prazos e tarefas, inclusive para colegas",
    "Editar e apagar apenas o que está sob sua responsabilidade"
  ],
  consulta: [
    "Ver tudo do escritório",
    "Nenhuma alteração: o acesso é somente de leitura"
  ]
};

export function ConfigPage({ eu }: { eu: Advogado }) {
  const { data: empresa, isPending } = useEmpresa();

  return (
    <>
      <div className="box">
        <h2>Empresa</h2>
        {isPending ? (
          <p className="muted">Carregando…</p>
        ) : empresa ? (
          <div className="detail-grid">
            <div><small>Razão social</small><strong>{empresa.razaoSocial}</strong></div>
            <div><small>CNPJ</small><strong>{empresa.cnpj}</strong></div>
          </div>
        ) : (
          <p className="muted">Nenhuma empresa cadastrada no banco ainda.</p>
        )}
      </div>

      <div className="box">
        <h2>Seu acesso</h2>
        <div className="detail-grid">
          <div><small>Nome</small><strong>{eu.nome}</strong></div>
          <div><small>E-mail</small><strong>{eu.email}</strong></div>
          <div><small>OAB</small><strong>{eu.oab ?? "—"}</strong></div>
          <div><small>Cargo</small><strong>{eu.cargo ?? "—"}</strong></div>
          <div>
            <small>Papel</small>
            <strong><span className="status-tag status-ok">{rotuloPapel(eu.papel)}</span></strong>
          </div>
        </div>

        <div className="detail-block">
          <small>O que este papel permite</small>
          <ul style={{ paddingLeft: 18, marginTop: 8 }}>
            {O_QUE_PODE[eu.papel].map((t) => (
              <li key={t} style={{ marginBottom: 4 }}>{t}</li>
            ))}
          </ul>
        </div>

        <p className="muted" style={{ fontSize: 12.5 }}>
          Para corrigir seus dados, use “Editar meu cadastro” na tela de Equipe.
          Papel e situação de acesso só um administrador altera.
        </p>
      </div>
    </>
  );
}
