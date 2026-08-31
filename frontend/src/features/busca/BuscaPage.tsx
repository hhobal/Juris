import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  chavePublicacoes,
  useImportarProcesso,
  useMarcarPublicacao,
  usePublicacoes,
  useSincronizarPublicacoes
} from "@/lib/queries/publicacoes";
import { useProcessos } from "@/lib/queries/processos";
import { usePrazos } from "@/lib/queries/prazos";
import { useAoVivo } from "@/lib/queries/realtime";
import { PrazoForm } from "@/features/prazos/PrazoForm";
import { ufDaSigla, ufDoNumeroCnj } from "@/lib/cnj";
import { formatar, hoje, somarDias } from "@/lib/datas";
import type { Advogado, Publicacao, SituacaoPublicacao } from "@/types/dominio";

/**
 * Etapa 3 do plano (docs/plano-busca-de-processos.md).
 *
 * A diferença para a Etapa 2 é que agora o sistema LEMBRA. A tela não mostra
 * mais o resultado cru de uma consulta: mostra o que já está guardado, e a
 * consulta só acrescenta o que faltava. É isso que permite responder "o que
 * apareceu de novo desde ontem?", que é a pergunta que a advogada realmente faz.
 *
 * O que a tela NÃO faz, de propósito: dizer se um prazo já foi cumprido. O DJEN
 * publica o ato, não a resposta a ele. Quem sabe é ela, e por isso existe o
 * botão "conferida".
 */

type Aba = "nova" | "conferida" | "ignorada";

export function BuscaPage({ eu }: { eu: Advogado }) {
  const { data: publicacoes, isPending, error } = usePublicacoes();
  const { data: processos } = useProcessos();
  const { data: prazos } = usePrazos();
  const sincronizar = useSincronizarPublicacoes(eu);

  const [de, setDe] = useState(() => somarDias(hoje(), -30));
  const [ate, setAte] = useState(() => hoje());
  const [aba, setAba] = useState<Aba>("nova");

  useAoVivo("publicacoes", chavePublicacoes);

  const semOab = !eu.oabNumero || !eu.oabUf;

  // Quais números já viraram processo cadastrado — inclui os que foram
  // cadastrados à mão, antes de a busca existir.
  const jaCadastrados = useMemo(
    () => new Set((processos ?? []).map((p) => p.numero)),
    [processos]
  );

  // Quais publicações já viraram prazo — o banco também impede a duplicata,
  // mas esconder o botão é melhor do que deixar clicar e mostrar erro.
  const comPrazo = useMemo(
    () => new Set((prazos ?? []).map((p) => p.publicacaoId).filter(Boolean) as string[]),
    [prazos]
  );

  const porAba = useMemo(() => {
    const vazio = { nova: [] as Publicacao[], conferida: [] as Publicacao[], ignorada: [] as Publicacao[] };
    for (const p of publicacoes ?? []) vazio[p.situacao].push(p);
    return vazio;
  }, [publicacoes]);

  return (
    <>
      <div className="box">
        <div className="box-head">
          <h2>Publicações no seu nome</h2>
          <span className="status-tag status-ok">Consulta gratuita</span>
        </div>
        <p className="muted">
          Consulta a <strong>API Comunica / DJEN do Conselho Nacional de Justiça</strong>,
          que reúne as intimações e publicações eletrônicas de todos os tribunais do país,
          pelo seu número de OAB. É dado público: sem login, sem certificado, e sem tocar
          no PJe ou no Projudi. Os processos importados são enriquecidos com a ficha
          completa do <strong>DataJud</strong>.
        </p>
      </div>

      {semOab ? (
        <div className="box">
          <div className="box-head">
            <h2>Falta cadastrar sua OAB</h2>
            <span className="status-tag status-wait">Pendente</span>
          </div>
          <p className="muted">
            A consulta usa o número de inscrição e a seccional para perguntar ao CNJ
            quais publicações são suas. Preencha os dois em{" "}
            <Link to="/config">Configurações → Editar perfil</Link> e volte aqui.
          </p>
        </div>
      ) : (
        <div className="box">
          <div className="box-head">
            <h2>Consultar o CNJ</h2>
            <span className="muted mono">
              OAB/{eu.oabUf} {eu.oabNumero}
              {eu.tribunaisMonitorados.length
                ? ` · ${eu.tribunaisMonitorados.join(", ")}`
                : " · todos os tribunais"}
            </span>
          </div>

          <div className="form-campos form-row">
            <label>
              De
              <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label>
              Até
              <input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
            </label>
          </div>

          <div className="pub-acoes">
            <button
              className="btn-primary"
              onClick={() => sincronizar.mutate({ de, ate })}
              disabled={sincronizar.isPending}
            >
              {sincronizar.isPending ? "Consultando o CNJ…" : "Buscar publicações"}
            </button>
          </div>

          {sincronizar.error && (
            <div className="login-error">{(sincronizar.error as Error).message}</div>
          )}

          {sincronizar.isSuccess && !sincronizar.isPending && (
            <p className="muted">
              {sincronizar.data.encontradas === 0 ? (
                <>
                  O CNJ não retornou nada entre {formatar(de)} e {formatar(ate)}. Em
                  períodos curtos isso é normal — experimente ampliar.
                </>
              ) : (
                <>
                  {sincronizar.data.encontradas} no período,{" "}
                  <strong>
                    {sincronizar.data.novas === 0
                      ? "nenhuma inédita"
                      : `${sincronizar.data.novas} ${
                          sincronizar.data.novas === 1 ? "inédita" : "inéditas"
                        }`}
                  </strong>
                  . O resto o sistema já conhecia.
                  {sincronizar.data.truncado && (
                    <>
                      {" "}O período rendeu publicações demais e a busca parou no teto —
                      reduza o intervalo para alcançar o resto.
                    </>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {error && <div className="empty-state">Não consegui carregar: {error.message}</div>}

      {isPending ? (
        <div className="empty-state">Carregando publicações…</div>
      ) : (publicacoes ?? []).length === 0 ? (
        !semOab && (
          <div className="empty-state">
            Nenhuma publicação guardada ainda. Use o botão acima para consultar o CNJ.
          </div>
        )
      ) : (
        <>
          <div className="tabs">
            <Botao aba="nova" atual={aba} aoClicar={setAba} rotulo="Novas" n={porAba.nova.length} />
            <Botao aba="conferida" atual={aba} aoClicar={setAba} rotulo="Conferidas" n={porAba.conferida.length} />
            <Botao aba="ignorada" atual={aba} aoClicar={setAba} rotulo="Ignoradas" n={porAba.ignorada.length} />
          </div>

          {porAba[aba].length === 0 ? (
            <div className="empty-state">
              {aba === "nova"
                ? "Tudo em dia: nenhuma publicação esperando conferência."
                : "Nada aqui."}
            </div>
          ) : (
            porAba[aba].map((p) => (
              <Cartao
                key={p.id}
                p={p}
                eu={eu}
                jaCadastrado={jaCadastrados.has(p.numeroProcesso)}
                jaTemPrazo={comPrazo.has(p.id)}
              />
            ))
          )}
        </>
      )}
    </>
  );
}

function Botao({
  aba, atual, aoClicar, rotulo, n
}: {
  aba: Aba; atual: Aba; aoClicar: (a: Aba) => void; rotulo: string; n: number;
}) {
  return (
    <button
      type="button"
      className={`tab ${aba === atual ? "active" : ""}`}
      onClick={() => aoClicar(aba)}
    >
      {rotulo} <span className="count-chip">{n}</span>
    </button>
  );
}

function Cartao({
  p, eu, jaCadastrado, jaTemPrazo
}: {
  p: Publicacao; eu: Advogado; jaCadastrado: boolean; jaTemPrazo: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [criandoPrazo, setCriandoPrazo] = useState(false);
  const importar = useImportarProcesso(eu.id);
  const marcar = useMarcarPublicacao();
  const navegar = useNavigate();

  const LIMITE = 320;
  const longo = (p.teor ?? "").length > LIMITE;
  const cadastrado = jaCadastrado || Boolean(p.processoId);

  const mudarPara = (situacao: SituacaoPublicacao) => marcar.mutate({ id: p.id, situacao });

  return (
    <div className="box">
      <div className="pub-head">
        <span className="pub-numero">{p.numeroProcesso}</span>
        <span className="uf-tag">{p.tribunal ?? "—"}</span>
      </div>

      <div className="pub-chips">
        <span className="tag-type">{p.tipo ?? "Publicação"}</span>
        <span className="badge badge-tranquilo sm">
          Disponibilizado em {formatar(p.disponibilizacao)}
        </span>
        {cadastrado && <span className="status-tag status-ok">Nos meus processos</span>}
        {jaTemPrazo && <span className="status-tag status-ok">Prazo criado</span>}
      </div>

      <div className="pub-grid">
        <div>
          <small>Órgão</small>
          <strong>{p.orgao ?? "—"}</strong>
        </div>
        <div>
          <small>Classe</small>
          <strong>{p.classe ?? "—"}</strong>
        </div>
        <div>
          <small>{p.partes.length === 1 ? "Parte" : "Partes"}</small>
          <strong>{p.partes.length ? p.partes.join(", ") : "—"}</strong>
        </div>
        <div>
          <small>Advogados intimados</small>
          <strong>{p.advogadosIntimados.length ? p.advogadosIntimados.join(" · ") : "—"}</strong>
        </div>
      </div>

      {p.teor && (
        <div className="pub-teor">
          <small>Teor da publicação</small>
          <p>{aberto || !longo ? p.teor : `${p.teor.slice(0, LIMITE)}…`}</p>
          {longo && (
            <button className="link-btn" type="button" onClick={() => setAberto((a) => !a)}>
              {aberto ? "Mostrar menos" : "Ler a publicação inteira"}
            </button>
          )}
        </div>
      )}

      <div className="pub-acoes">
        {/* Nem toda publicação gera prazo, mas quase toda vale virar processo.
            Por isso a ação de processo nunca some: antes de cadastrar ela
            cadastra, depois de cadastrado ela leva até lá. */}
        {cadastrado ? (
          <button
            className="btn-secondary"
            onClick={() => navegar(`/processos?q=${encodeURIComponent(p.numeroProcesso)}`)}
          >
            Ver em Processos
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => importar.mutate(p)}
            disabled={importar.isPending}
          >
            {importar.isPending ? "Colocando…" : "Colocar em meus processos"}
          </button>
        )}

        {!jaTemPrazo && (
          <button className="btn-secondary" onClick={() => setCriandoPrazo(true)}>
            Criar prazo
          </button>
        )}

        {p.situacao !== "conferida" && (
          <button
            className="btn-secondary"
            onClick={() => mudarPara("conferida")}
            disabled={marcar.isPending}
          >
            Já conferi
          </button>
        )}

        {p.situacao !== "ignorada" && (
          <button
            className="btn-secondary"
            onClick={() => mudarPara("ignorada")}
            disabled={marcar.isPending}
          >
            Ignorar
          </button>
        )}

        {p.situacao !== "nova" && (
          <button
            className="link-btn"
            type="button"
            onClick={() => mudarPara("nova")}
            disabled={marcar.isPending}
          >
            Voltar para novas
          </button>
        )}

        {p.link && (
          <a
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="link-btn pub-externo"
          >
            Abrir no tribunal ↗
          </a>
        )}
      </div>

      {importar.error && (
        <div className="login-error pub-erro">{(importar.error as Error).message}</div>
      )}
      {marcar.error && <div className="login-error pub-erro">{(marcar.error as Error).message}</div>}
      {importar.isSuccess && importar.data.jaExistia && (
        <p className="muted">Esse processo já estava cadastrado — apenas vinculei a publicação a ele.</p>
      )}

      {criandoPrazo && (
        <PrazoForm
          eu={eu}
          prazo={null}
          disponibilizacao={p.disponibilizacao}
          prefill={{
            numeroProcesso: p.numeroProcesso,
            parteAutora: p.partes[0] ?? "",
            estado: ufDoNumeroCnj(p.numeroProcesso) ?? ufDaSigla(p.tribunal) ?? "",
            publicacaoId: p.id
          }}
          aoFechar={() => setCriandoPrazo(false)}
        />
      )}
    </div>
  );
}
