import { useState, type FormEvent } from "react";
import { useSalvarProcesso } from "@/lib/queries/processos";
import type { Advogado, Processo, StatusProcesso } from "@/types/dominio";

const TIPOS = ["Trabalhista", "Cível", "Tributário", "Criminal", "Administrativo"];
const STATUS: StatusProcesso[] = ["Em andamento", "Suspenso", "Encerrado"];

interface Props {
  eu: Advogado;
  /** null = cadastrar um novo */
  processo: Processo | null;
  advogados: Advogado[];
  aoFechar: () => void;
}

export function ProcessoForm({ eu, processo, advogados, aoFechar }: Props) {
  const salvar = useSalvarProcesso();
  const editando = processo !== null;

  const [form, setForm] = useState({
    numero: processo?.numero ?? "",
    parte: processo?.parte ?? "",
    tipo: processo?.tipo ?? "Trabalhista",
    tribunal: processo?.tribunal ?? "",
    vara: processo?.vara ?? "",
    advogadoId: processo?.advogadoId ?? eu.id,
    status: processo?.status ?? ("Em andamento" as StatusProcesso),
    fase: processo?.fase ?? "",
    valorCausa: processo?.valorCausa ?? 0,
    distribuicao: processo?.distribuicao ?? "",
    ultimaMov: processo?.ultimaMov ?? ""
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate({ ...form, ...(processo ? { id: processo.id } : {}) }, { onSuccess: aoFechar });
  }

  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editando ? "Editar processo" : "Novo processo"}</h2>
          <button className="icon-btn" onClick={aoFechar} type="button">✕</button>
        </div>

        <form className="form-modal" onSubmit={aoEnviar}>
          <label>
            Número do processo (CNJ)
            <input
              className="mono"
              value={form.numero}
              onChange={(e) => campo("numero", e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
              required
            />
          </label>

          <label>
            Partes envolvidas
            <input
              value={form.parte}
              onChange={(e) => campo("parte", e.target.value)}
              placeholder="Ex: Empresa Exemplo Ltda. x João da Silva"
              required
            />
          </label>

          <div className="form-row">
            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              Tribunal
              <input
                value={form.tribunal}
                onChange={(e) => campo("tribunal", e.target.value)}
                placeholder="Ex: TJPR, TRT-9, TRF-4…"
              />
            </label>
          </div>

          <label>
            Vara
            <input
              value={form.vara}
              onChange={(e) => campo("vara", e.target.value)}
              placeholder="Ex: 3ª Vara Cível de Curitiba"
            />
          </label>

          <div className="form-row">
            <label>
              Advogado responsável
              <select
                value={form.advogadoId ?? ""}
                onChange={(e) => campo("advogadoId", e.target.value)}
                required
              >
                {advogados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => campo("status", e.target.value as StatusProcesso)}
              >
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Fase atual
              <input
                value={form.fase}
                onChange={(e) => campo("fase", e.target.value)}
                placeholder="Ex: Citação, Contestação, Recurso…"
              />
            </label>
            <label>
              Valor da causa (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valorCausa}
                onChange={(e) => campo("valorCausa", Number(e.target.value) || 0)}
                placeholder="0,00"
              />
            </label>
          </div>

          <label>
            Data de distribuição
            <input
              type="date"
              value={form.distribuicao ?? ""}
              onChange={(e) => campo("distribuicao", e.target.value)}
            />
          </label>

          <label>
            Última movimentação
            <input
              value={form.ultimaMov}
              onChange={(e) => campo("ultimaMov", e.target.value)}
              placeholder="Ex: Citação recebida — aguardando manifestação"
            />
          </label>

          {editando && form.advogadoId !== processo.advogadoId && (
            <div className="login-error">
              Ao trocar o responsável, este processo sai da sua responsabilidade e
              você não poderá mais editá-lo.
            </div>
          )}

          {salvar.error && <div className="login-error">{salvar.error.message}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : "Salvar processo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
