import { useState, type FormEvent } from "react";
import { useSalvarPerfil } from "@/lib/queries/perfil";
import type { Advogado } from "@/types/dominio";
import { Modal } from "@/app/Modal";

const CORES = ["#C9A24B", "#8B93A6", "#4CB8A4", "#5B8DEF", "#C24B3E", "#4FAD79"];

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function MeuPerfilForm({ eu, aoFechar }: { eu: Advogado; aoFechar: () => void }) {
  const salvar = useSalvarPerfil(eu.id);

  const [form, setForm] = useState({
    nome: eu.nome,
    oabNumero: eu.oabNumero ?? "",
    oabUf: eu.oabUf ?? "",
    cargo: eu.cargo ?? "",
    // no formulário é uma linha de texto; vira array na hora de salvar
    tribunais: eu.tribunaisMonitorados.join(", "),
    cor: eu.cor
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        nome: form.nome,
        cargo: form.cargo,
        cor: form.cor,
        // o banco só aceita dígitos, e a API do CNJ também: "45.211" vira "45211"
        oabNumero: form.oabNumero.replace(/\D/g, "") || null,
        oabUf: form.oabUf || null,
        tribunaisMonitorados: form.tribunais
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      },
      { onSuccess: aoFechar }
    );
  }

  return (
    <Modal aoFechar={aoFechar}>
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
              OAB — número
              <input
                value={form.oabNumero}
                onChange={(e) => campo("oabNumero", e.target.value)}
                placeholder="Ex: 45211"
                inputMode="numeric"
              />
            </label>
            <label>
              OAB — seccional
              <select value={form.oabUf} onChange={(e) => campo("oabUf", e.target.value)}>
                <option value="">Selecione</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="campo-ajuda">
            Número e seccional vão separados porque é assim que a busca automática
            consulta o CNJ. Pode digitar com pontos — eles são removidos ao salvar.
          </p>

          <label>
            Cargo
            <input
              value={form.cargo}
              onChange={(e) => campo("cargo", e.target.value)}
              placeholder="Ex: Advogada Trabalhista"
            />
          </label>

          <label>
            Tribunais monitorados
            <input
              value={form.tribunais}
              onChange={(e) => campo("tribunais", e.target.value)}
              placeholder="Ex: TJPR, TRT9, TRF4"
            />
          </label>

          <p className="campo-ajuda">
            Filtro opcional da busca automática. Deixe vazio para monitorar todos os
            tribunais — é o que a maioria vai querer.
          </p>

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
    </Modal>
  );
}
