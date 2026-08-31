import { useState, type FormEvent } from "react";
import { useSalvarPerfil } from "@/lib/queries/perfil";
import type { Advogado } from "@/types/dominio";

const CORES = ["#C9A24B", "#8B93A6", "#4CB8A4", "#5B8DEF", "#C24B3E", "#4FAD79"];

export function MeuPerfilForm({ eu, aoFechar }: { eu: Advogado; aoFechar: () => void }) {
  const salvar = useSalvarPerfil(eu.id);

  const [form, setForm] = useState({
    nome: eu.nome,
    oab: eu.oab ?? "",
    cargo: eu.cargo ?? "",
    cor: eu.cor
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(form, { onSuccess: aoFechar });
  }

  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Editar meu perfil</h2>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <form className="form-modal" onSubmit={aoEnviar}>
          <label>
            Nome completo
            <input
              value={form.nome}
              onChange={(e) => campo("nome", e.target.value)}
              placeholder="Ex: Dra. Camila Rezende"
              required
            />
          </label>

          <div className="form-row">
            <label>
              OAB
              <input
                value={form.oab}
                onChange={(e) => campo("oab", e.target.value)}
                placeholder="Ex: PR 45.211"
              />
            </label>
            <label>
              Cargo
              <input
                value={form.cargo}
                onChange={(e) => campo("cargo", e.target.value)}
                placeholder="Ex: Advogada Trabalhista"
              />
            </label>
          </div>

          <label>
            Cor no sistema
            <div style={{ display: "flex", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => campo("cor", c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={form.cor === c}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", background: c,
                    cursor: "pointer",
                    border: form.cor === c ? "2px solid var(--text)" : "2px solid transparent"
                  }}
                />
              ))}
            </div>
          </label>

          {salvar.error && <div className="login-error">{salvar.error.message}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
