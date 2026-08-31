import { useState, type FormEvent } from "react";
import {
  useCompartilhamentos,
  useCompartilhar,
  useDescompartilhar
} from "@/lib/queries/compartilhamentos";
import type { Advogado, Processo } from "@/types/dominio";
import { Modal } from "@/app/Modal";

/**
 * Libera a leitura de um processo para o e-mail de um colega.
 *
 * O colega não precisa ter conta. Se ele se cadastrar depois, no mesmo
 * e-mail, o processo aparece para ele sozinho — é o e-mail que manda, não
 * um vínculo com uma conta que talvez nem exista.
 */
export function CompartilharForm({
  eu, processo, aoFechar
}: {
  eu: Advogado; processo: Processo; aoFechar: () => void;
}) {
  const { data: lista, isPending } = useCompartilhamentos(processo.id);
  const compartilhar = useCompartilhar(processo.id, eu.id);
  const descompartilhar = useDescompartilhar(processo.id);

  const [email, setEmail] = useState("");

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    compartilhar.mutate(email, { onSuccess: () => setEmail("") });
  }

  return (
    <Modal aoFechar={aoFechar}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Compartilhar processo</div>
            <h2 className="mono">{processo.numero}</h2>
          </div>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <p className="muted">
          Quem você listar aqui passa a <strong>ver</strong> este processo, com os prazos
          e as tarefas ligados a ele. Editar, apagar e criar continua sendo só seu.
        </p>

        <form className="form-modal" onSubmit={aoEnviar}>
          <label>
            E-mail do colega
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colega@escritorio.com.br"
              required
            />
          </label>

          <p className="campo-ajuda">
            Não precisa ter conta ainda. Se essa pessoa se cadastrar no Juris com esse
            mesmo e-mail, o processo aparece para ela automaticamente.
          </p>

          {compartilhar.error && (
            <div className="login-error">{(compartilhar.error as Error).message}</div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn-primary btn-block"
              disabled={compartilhar.isPending}
            >
              {compartilhar.isPending ? "Compartilhando…" : "Compartilhar"}
            </button>
          </div>
        </form>

        <div className="detail-block">
          <small>Quem já tem acesso</small>

          {isPending ? (
            <p className="muted">Carregando…</p>
          ) : (lista ?? []).length === 0 ? (
            <p className="muted">Ninguém ainda — este processo é só seu.</p>
          ) : (
            (lista ?? []).map((c) => (
              <div className="task-row" key={c.id}>
                <div className="task-row-info">
                  <strong>{c.emailConvidado}</strong>
                </div>
                <button
                  className="icon-btn tiny"
                  title="Remover o acesso"
                  onClick={() => descompartilhar.mutate(c.id)}
                  disabled={descompartilhar.isPending}
                >
                  ✕
                </button>
              </div>
            ))
          )}

          {descompartilhar.error && (
            <div className="login-error">{(descompartilhar.error as Error).message}</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
