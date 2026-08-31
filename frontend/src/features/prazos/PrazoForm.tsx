import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSalvarPrazo } from "@/lib/queries/prazos";
import { usePublicacoes } from "@/lib/queries/publicacoes";
import { formatar } from "@/lib/datas";
import { ufDoNumeroCnj } from "@/lib/cnj";
import { calcularPrazo } from "@/lib/prazoLegal";
import type { Advogado, NovoPrazo, Prazo, TipoPrazo } from "@/types/dominio";
import { Modal } from "@/app/Modal";

/** Os tamanhos que cobrem quase toda intimação. O certo está no texto dela. */
const TAMANHOS = [5, 10, 15, 30];

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
  /**
   * Data de disponibilização no diário. Quando vem preenchida, o formulário
   * sugere o vencimento pelo CPC e nasce marcado "a conferir".
   */
  disponibilizacao?: string;
  aoFechar: () => void;
}

export function PrazoForm({ eu, prazo, prefill, disponibilizacao, aoFechar }: Props) {
  const salvar = useSalvarPrazo();
  const editando = prazo !== null;
  const base = prazo ?? prefill;

  const [form, setForm] = useState<NovoPrazo>(() => {
    const numero = base?.numeroProcesso ?? "";
    const sugerido = disponibilizacao ? calcularPrazo(disponibilizacao, 15) : null;

    return {
      numeroProcesso: numero,
      parteAutora: base?.parteAutora ?? "",
      // o número CNJ já diz a UF; perguntar de novo só cria chance de erro
      estado: base?.estado || ufDoNumeroCnj(numero) || "",
      descricao: base?.descricao ?? "",
      tipo: base?.tipo ?? ("Prazo processual" as TipoPrazo),
      // Prazo novo já nasce no nome de quem está cadastrando — é o caso comum.
      advogadoId: base?.advogadoId ?? eu.id,
      // Vazio de propósito quando não há cálculo: uma data padrão que parece
      // válida e não é seria pior do que campo em branco.
      vencimento: base?.vencimento ?? sugerido?.vencimento ?? "",
      origem: base?.origem ?? (disponibilizacao ? "djen" : "manual"),
      confirmado: base?.confirmado ?? !disponibilizacao,
      diasUteis: base?.diasUteis ?? (disponibilizacao ? 15 : null),
      publicacaoId: base?.publicacaoId ?? null
    };
  });

  const campo = <K extends keyof NovoPrazo>(chave: K, valor: NovoPrazo[K]) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  /**
   * Quando o prazo nasce de uma publicação, a data da disponibilização vem
   * pronta. Quando nasce da tela de Processos, ela não existe — mas o advogado
   * tem a intimação na mão e sabe a data. Este campo deixa ele informar, e o
   * cálculo passa a valer nos dois caminhos.
   */
  const [dispoManual, setDispoManual] = useState("");
  const [tocouDispo, setTocouDispo] = useState(false);
  const dataBase = disponibilizacao ?? (dispoManual || null);

  /**
   * A data da publicação não precisa ser digitada se a Busca já a trouxe.
   * Procura a publicação mais recente do mesmo processo entre as que estão
   * guardadas — é a intimação que provavelmente gerou este prazo.
   */
  const { data: publicacoes } = usePublicacoes();

  const publicacaoDoProcesso = useMemo(() => {
    // Nunca ao editar: a data salva foi decidida por uma pessoa e não pode ser
    // recalculada por baixo dela. Nem quando a data já veio da publicação.
    if (disponibilizacao || editando) return null;
    const digitos = form.numeroProcesso.replace(/\D/g, "");
    if (digitos.length !== 20) return null;

    return (
      (publicacoes ?? [])
        .filter((p) => p.numeroProcessoLimpo === digitos)
        .sort((a, b) => b.disponibilizacao.localeCompare(a.disponibilizacao))[0] ?? null
    );
  }, [publicacoes, form.numeroProcesso, disponibilizacao]);

  // Preenche sozinho enquanto a pessoa não tiver mexido no campo. Depois que
  // ela mexer, o que ela escolheu manda — inclusive apagar.
  useEffect(() => {
    if (tocouDispo || editando || !publicacaoDoProcesso) return;

    const dias = form.diasUteis ?? 15;
    const c = calcularPrazo(publicacaoDoProcesso.disponibilizacao, dias);
    setDispoManual(publicacaoDoProcesso.disponibilizacao);
    setForm((f) => ({ ...f, diasUteis: dias, vencimento: c.vencimento }));
    // form.diasUteis de propósito fora das dependências: só o achado da
    // publicação deve disparar isto, não cada troca de tamanho do prazo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicacaoDoProcesso, tocouDispo]);

  const calculo = useMemo(
    () => (dataBase && form.diasUteis ? calcularPrazo(dataBase, form.diasUteis) : null),
    [dataBase, form.diasUteis]
  );

  /** Trocar o tamanho do prazo refaz a conta e move a data junto. */
  function mudarTamanho(dias: number) {
    if (!dataBase) return;
    const c = calcularPrazo(dataBase, dias);
    setForm((f) => ({ ...f, diasUteis: dias, vencimento: c.vencimento }));
  }

  /** Informar a data da publicação liga o cálculo; apagar desliga. */
  function mudarDisponibilizacao(valor: string) {
    setDispoManual(valor);

    if (!valor) {
      setForm((f) => ({ ...f, diasUteis: null }));
      return;
    }

    const dias = form.diasUteis ?? 15;
    const c = calcularPrazo(valor, dias);
    setForm((f) => ({ ...f, diasUteis: dias, vencimento: c.vencimento }));
  }

  /** Digitou o número: se o estado ainda está vazio, deduz do próprio número. */
  function mudarNumero(valor: string) {
    setForm((f) => ({
      ...f,
      numeroProcesso: valor,
      estado: f.estado || ufDoNumeroCnj(valor) || ""
    }));
  }

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Quando a data foi calculada, quem decide se ela já está conferida é o
    // botão que a pessoa apertou. `submitter` diz qual foi — é por isso que os
    // dois são type="submit": assim a validação dos outros campos roda igual
    // nos dois caminhos, o que não aconteceria com um deles sendo type="button".
    const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const confirmado = calculo ? botao?.value !== "conferir" : form.confirmado;

    salvar.mutate(
      { ...form, confirmado, ...(prazo ? { id: prazo.id } : {}) },
      { onSuccess: aoFechar }
    );
  }

  return (
    <Modal aoFechar={aoFechar}>
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
                onChange={(e) => mudarNumero(e.target.value)}
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

          {/* Só quando a data não veio de uma publicação — ali ela já é conhecida
              e perguntar de novo seria pedir o que o sistema já sabe. */}
          {!disponibilizacao && (
            <>
              <label>
                Data da publicação no diário
                <input
                  type="date"
                  value={dispoManual}
                  onChange={(e) => {
                    setTocouDispo(true);
                    mudarDisponibilizacao(e.target.value);
                  }}
                />
              </label>
              <p className="campo-ajuda">
                {publicacaoDoProcesso && !tocouDispo ? (
                  <>
                    Preenchida com a publicação de{" "}
                    <strong>{formatar(publicacaoDoProcesso.disponibilizacao)}</strong> que a
                    Busca encontrou para este processo
                    {publicacaoDoProcesso.tipo ? ` (${publicacaoDoProcesso.tipo})` : ""}. Troque
                    a data se a intimação em questão for outra.
                  </>
                ) : (
                  <>
                    Opcional. Preenchendo, o sistema calcula o vencimento pela contagem do CPC
                    — dias úteis, feriados nacionais e recesso. Deixe vazio para digitar a data
                    de vencimento à mão.
                  </>
                )}
              </p>
            </>
          )}

          {calculo && (
            <div className="detail-block">
              <small>Tamanho do prazo</small>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 10px" }}>
                {TAMANHOS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`tab ${form.diasUteis === d ? "active" : ""}`}
                    onClick={() => mudarTamanho(d)}
                  >
                    {d} dias úteis
                  </button>
                ))}
              </div>

              <small>Como o sistema chegou nessa data</small>
              <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Disponibilizado em <strong>{formatar(calculo.disponibilizacao)}</strong> →
                publicado em <strong>{formatar(calculo.publicacao)}</strong> (1º dia útil
                seguinte, art. 224 §2º) → contagem inicia em{" "}
                <strong>{formatar(calculo.inicio)}</strong> (§3º) → vence em{" "}
                <strong>{formatar(calculo.vencimento)}</strong> após {calculo.diasUteis} dias
                úteis.
              </p>

              <small>Confira antes de salvar</small>
              <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, paddingLeft: 18, margin: "4px 0 0" }}>
                {calculo.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}

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

          {/* Com data calculada, salvar é uma decisão de duas saídas: assumir a
              conta como certa, ou guardar o prazo já marcado para revisão. A
              segunda existe para ninguém se sentir obrigado a decidir na hora —
              o prazo entra no sistema de qualquer jeito, que é o que importa. */}
          {calculo ? (
            <>
              <div className="acoes-duplas">
                <button
                  type="submit"
                  value="confirmar"
                  className="btn-primary"
                  disabled={salvar.isPending}
                >
                  {salvar.isPending ? "Salvando…" : "Salvar e confirmar"}
                </button>
                <button
                  type="submit"
                  value="conferir"
                  className="btn-secondary"
                  disabled={salvar.isPending}
                >
                  Salvar para conferir depois
                </button>
              </div>
              <p className="campo-ajuda" style={{ margin: "10px 0 0" }}>
                “Conferir depois” guarda o prazo com o selo <strong>A conferir</strong> na tela
                de Prazos, para você confirmar a data quando tiver lido a intimação.
              </p>
            </>
          ) : (
            <div className="modal-actions">
              <button type="submit" className="btn-primary btn-block" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando…" : "Salvar prazo"}
              </button>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
