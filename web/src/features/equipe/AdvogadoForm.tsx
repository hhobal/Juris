import { useState, type FormEvent } from "react";
import { useSalvarAdvogado } from "@/lib/queries/equipe";
import { ehAdmin, rotuloPapel } from "@/lib/permissoes";
import type { Advogado, Papel } from "@/types/dominio";

const PAPEIS: Papel[] = ["admin", "advogado", "consulta"];

const DESCRICAO: Record<Papel, string> = {
  admin: "Vê e edita tudo, e é o único que cadastra, promove e desativa pessoas.",
  advogado: "Vê tudo do escritório e cria à vontade, mas só edita e apaga o que é dele.",
  consulta: "Vê tudo, não altera nada. Para estagiário, secretaria ou controladoria."
};

const CORES = ["#C9A24B", "#8B93A6", "#4CB8A4", "#5B8DEF", "#C24B3E", "#4FAD79"];

interface Props {
  eu: Advogado;
  /** null = cadastrar alguém novo */
  advogado: Advogado | null;
  aoFechar: () => void;
}

export function AdvogadoForm({ eu, advogado, aoFechar }: Props) {
  const salvar = useSalvarAdvogado();
  const editando = advogado !== null;
  const souAdmin = ehAdmin(eu);
  const ehMeuProprio = advogado?.id === eu.id;

  const [form, setForm] = useState({
    nome: advogado?.nome ?? "",
    email: advogado?.email ?? "",
    oab: advogado?.oab ?? "",
    cargo: advogado?.cargo ?? "",
    cor: advogado?.cor ?? "#C9A24B",
    papel: advogado?.papel ?? ("advogado" as Papel),
    ativo: advogado?.ativo ?? true
  });

  const campo = <K extends keyof typeof form>(chave: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate({ ...form, ...(advogado ? { id: advogado.id } : {}) }, { onSuccess: aoFechar });
  }

  return (
    <div className="modal-backdrop show" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{editando ? "Editar cadastro" : "Cadastrar advogado"}</h2>
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

          <label>
            E-mail corporativo
            <input
              type="email"
              value={form.email}
              onChange={(e) => campo("email", e.target.value)}
              placeholder="pessoa@empresa.com.br"
              required
              // Trocar o e-mail depois desliga a pessoa do login já criado.
              disabled={editando && advogado.temLogin}
            />
          </label>

          {editando && advogado.temLogin && (
            <p className="muted" style={{ marginTop: -8, marginBottom: 14, fontSize: 12 }}>
              O e-mail não muda depois que o login existe — é ele que liga o cadastro
              à conta de acesso.
            </p>
          )}

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

          {/* Papel e situação só aparecem para admin. O banco recusaria de
              qualquer forma (trigger protege_papel), mas mostrar um campo que
              vai dar erro no envio é pior do que não mostrar. */}
          {souAdmin && (
            <>
              <label>
                Papel
                <select
                  value={form.papel}
                  onChange={(e) => campo("papel", e.target.value as Papel)}
                >
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>{rotuloPapel(p)}</option>
                  ))}
                </select>
              </label>
              <p className="muted" style={{ marginTop: -8, marginBottom: 14, fontSize: 12 }}>
                {DESCRICAO[form.papel]}
              </p>

              {editando && (
                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => campo("ativo", e.target.checked)}
                    style={{ width: "auto", margin: 0 }}
                  />
                  Acesso ativo
                </label>
              )}
            </>
          )}

          {editando && souAdmin && ehMeuProprio && form.papel !== "admin" && (
            <div className="login-error">
              Você está tirando o seu próprio acesso de administrador. Se não houver
              outro admin, ninguém mais conseguirá cadastrar pessoas pelo sistema.
            </div>
          )}

          {!editando && (
            <div className="detail-block">
              <small>Falta um passo depois de salvar</small>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Este cadastro é o convite. Para a pessoa conseguir entrar, crie o login
                no painel do Supabase em <strong>Authentication → Users → Add user</strong>,
                com este mesmo e-mail e a opção <strong>Auto Confirm User</strong> marcada.
                O vínculo é feito automaticamente.
              </p>
            </div>
          )}

          {salvar.error && <div className="login-error">{salvar.error.message}</div>}

          <div className="modal-actions">
            <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
