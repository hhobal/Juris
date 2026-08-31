import { useState } from "react";
import { MeuPerfilForm } from "./MeuPerfilForm";
import type { Advogado } from "@/types/dominio";

export function ConfigPage({ eu }: { eu: Advogado }) {
  const [editando, setEditando] = useState(false);

  return (
    <>
      <div className="box">
        <div className="box-head">
          <h2>Seu perfil</h2>
          <button className="btn-secondary" style={{ flex: "none" }} onClick={() => setEditando(true)}>
            Editar perfil
          </button>
        </div>

        <div className="detail-grid">
          <div><small>Nome</small><strong>{eu.nome}</strong></div>
          <div><small>E-mail</small><strong>{eu.email}</strong></div>
          <div><small>OAB</small><strong>{eu.oab ?? "—"}</strong></div>
          <div><small>Cargo</small><strong>{eu.cargo ?? "—"}</strong></div>
          <div>
            <small>Cor no sistema</small>
            <strong>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block", width: 16, height: 16, borderRadius: "50%",
                  background: eu.cor, verticalAlign: "middle", marginRight: 6
                }}
              />
              {eu.cor}
            </strong>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
          O Juris é individual: só você vê e mexe nos seus processos, prazos e tarefas.
          Não é possível trocar o e-mail depois de criada a conta — é ele que liga o
          perfil ao login.
        </p>
      </div>

      {editando && <MeuPerfilForm eu={eu} aoFechar={() => setEditando(false)} />}
    </>
  );
}
