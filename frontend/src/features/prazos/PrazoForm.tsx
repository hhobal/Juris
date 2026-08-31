import { useState, type FormEvent } from "react";
import { useSalvarPrazo } from "@/lib/queries/prazos";
import { hoje } from "@/lib/datas";
import type { Advogado, Prazo, TipoPrazo } from "@/types/dominio";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const TIPOS: TipoPrazo[] = ["Prazo processual", "Audiência", "Recurso"];

interface Props {
  eu: Advogado;
  /** null = cadastrar um novo */
  prazo: Prazo | null;
  /** valores iniciais ao criar — usado pelo "+ Criar prazo" da tela de processo */
  prefill?: Partial<Prazo>;
  aoFechar: () => void;
}

export function PrazoForm({ eu, prazo, prefill, aoFechar }: Props) {
  const salvar = useSalvarPrazo();
  const editando = prazo !== null;
  const base = prazo ?? prefill;

  const [form, setForm] = useState({
    numeroProcesso: base?.numeroProcesso ?? "",
    parteAutora: base?.parteAutora ?? "",
    estado: base?.estado ?? "",
    descricao: base?.descricao ?? "",
    tipo: base?.tipo ?? ("Prazo processual" as TipoPrazo),
    // Prazo novo já nasce no nome de quem está cadastrando — é o caso comum.
    advogadoId: base?.advogadoId ?? eu.id,
    vencimento: base?.vencimento ?? hoje()
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      { ...form, ...(prazo ? { id: prazo.id } : {}) },
      { onSuccess: aoFechar }
    );
  }

  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editando ? "Editar prazo" : "Novo prazo"}</h2>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <form className="form-modal" onSubmit={aoEnviar}>
          <div className="form-row">
            <label>
              Número do processo
              <input
                className="mono"
                value={form.numeroProcesso}
                onChange={(e) => campo("numeroProcesso", e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                required
              />
            </label>
            <label>
              Estado
              <select value={form.estado} onChange={(e) => campo("estado", e.target.value)} required>
                <option value="">Selecione…</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Nome da parte autora
            <input
              value={form.parteAutora}
              onChange={(e) => campo("parteAutora", e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </label>

          <label>
            Descrição
            <input
              value={form.descricao}
              onChange={(e) => campo("descricao", e.target.value)}
              placeholder="Ex: Contestação, Réplica, Audiência…"
              required
            />
          </label>

          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => campo("tipo", e.target.value as TipoPrazo)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Data de vencimento
            <input
              type="date"
              value={form.vencimento}
              onChange={(e) => campo("vencimento", e.target.value)}
              required
            />
          </label>

          {salvar.error && <div className="login-error">{salvar.error.message}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar prazo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
