import { useEffect, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSair } from "@/lib/queries/sessao";
import { oabTexto } from "@/lib/queries/advogados";
import { usePrazos } from "@/lib/queries/prazos";
import { diasAte } from "@/lib/datas";
import { useTema } from "@/lib/tema";
import type { Advogado } from "@/types/dominio";

// Prazos primeiro entre as telas de trabalho: é a razão de o sistema existir.
// "Busca de Processos" desceu — ela hoje só explica por que a funcionalidade
// ainda não existe, e ocupava a segunda posição. "Equipe" saiu de vez: sem
// escritório compartilhado, não existe mais colega nenhum para ver ali.
const MENU = [
  { para: "/painel", ico: "◇", texto: "Painel", titulo: "Sua visão geral" },
  { para: "/prazos", ico: "◷", texto: "Prazos", titulo: "Nunca mais perca uma data" },
  { para: "/tarefas", ico: "▦", texto: "Quadro de Tarefas", titulo: "Organize o que você precisa fazer" },
  { para: "/processos", ico: "▤", texto: "Processos", titulo: "Consulte e acompanhe os seus processos" },
  { para: "/relatorios", ico: "▩", texto: "Relatórios", titulo: "Seus indicadores" },
  { para: "/busca", ico: "⌕", texto: "Busca de Processos", titulo: "Monitoramento automático nos tribunais" },
  { para: "/config", ico: "⚙", texto: "Configurações", titulo: "Seu perfil e sua conta" }
];

export function Shell({ eu }: { eu: Advogado }) {
  const sair = useSair();
  const { tema, alternar: alternarTema } = useTema();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { data: prazos } = usePrazos();

  const [busca, setBusca] = useState("");

  // Ao sair da tela de resultados, o campo esvazia; ao voltar para ela pelo
  // histórico, volta preenchido com o que está na URL.
  useEffect(() => {
    setBusca(pathname === "/resultados" ? (params.get("q") ?? "") : "");
  }, [pathname, params]);

  const atual =
    pathname === "/resultados"
      ? { texto: "Busca", titulo: "Resultados nos seus dados" }
      : MENU.find((m) => m.para === pathname) ?? MENU[0];

  // Só os SEUS prazos: o selo fica ao lado do seu nome e do seu menu, então
  // contar os do escritório inteiro seria enganoso.
  const meus = (prazos ?? []).filter((p) => p.advogadoId === eu.id);
  const vencidos = meus.filter((p) => diasAte(p.vencimento) < 0).length;
  const naSemana = meus.filter((p) => {
    const d = diasAte(p.vencimento);
    return d >= 0 && d <= 7;
  }).length;

  function buscar(e: FormEvent) {
    e.preventDefault();
    const termo = busca.trim();
    if (termo) navegar(`/resultados?q=${encodeURIComponent(termo)}`);
  }

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="logo">
          <img
            className="brand-mark"
            src={tema === "claro" ? "/juris-mark-dark.svg" : "/juris-mark-gold.svg"}
            alt="Juris"
          />
          <div className="logo-text">
            <div className="brand-name">Juris</div>
            <span className="brand-rule" aria-hidden="true" />
            <div className="brand-sub">Departamento Jurídico</div>
          </div>
        </div>

        <nav>
          {MENU.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              title={item.texto}
              className={({ isActive }) => (isActive ? "menu active" : "menu")}
            >
              <span className="ico">{item.ico}</span>
              {item.texto}
              {/* Vencido é vermelho e ganha prioridade; a semana é dourada. */}
              {item.para === "/prazos" && vencidos > 0 && (
                <span className="menu-selo" title={`${vencidos} prazo(s) seu(s) vencido(s)`}>
                  {vencidos}
                </span>
              )}
              {item.para === "/prazos" && vencidos === 0 && naSemana > 0 && (
                <span className="menu-selo atencao" title={`${naSemana} prazo(s) seu(s) nos próximos 7 dias`}>
                  {naSemana}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-stat">
            <span>{naSemana}</span>
            <small>meus prazos nos próx. 7 dias</small>
          </div>
        </div>
      </aside>

      <main className="main-area">
        {/* Barra superior fixa: fica visível ao rolar a tela, como numa
            aplicação de verdade — não some com o resto do cabeçalho. Reúne
            busca, sino de prazos vencidos, tema e identidade do usuário
            num único lugar, em vez de espalhados entre sidebar e cabeçalho
            de página. */}
        <header className="topbar">
          <form className="global-search" onSubmit={buscar}>
            <span className="search-ico" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar processo, prazo ou tarefa..."
              aria-label="Buscar nos seus dados"
            />
          </form>

          <div className="topbar-right">
            <button
              className="icon-btn notif-btn"
              type="button"
              title={vencidos > 0 ? `${vencidos} prazo(s) seu(s) vencido(s)` : "Sem prazos vencidos"}
              onClick={() => navegar("/prazos")}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6.2V11c0-3.4-1.8-6.24-5-6.98V3.5a2 2 0 1 0-4 0v.52C6.8 4.76 5 7.6 5 11v4.8L3 17.8v1H21v-1l-2-2Z"
                />
              </svg>
              {vencidos > 0 && <span className="notif-badge">{vencidos}</span>}
            </button>

            <button
              className="theme-btn"
              type="button"
              title={tema === "claro" ? "Mudar para tema escuro" : "Mudar para tema claro"}
              onClick={alternarTema}
            >
              {tema === "claro" ? "☾" : "☀"}
            </button>

            <div className="user">
              <span className="avatar" style={{ background: eu.cor }}>
                {eu.iniciais}
              </span>
              <div className="user-info">
                <strong>{eu.nome}</strong>
                <small>{oabTexto(eu) ?? eu.cargo ?? eu.email}</small>
              </div>
              <button
                className="logout-btn"
                title="Sair"
                onClick={() => sair.mutate()}
                disabled={sair.isPending}
              >
                ⏻
              </button>
            </div>
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div className="eyebrow">{atual?.texto}</div>
            <h1>{atual?.titulo}</h1>
          </div>

          {/* key={pathname} força o React a remontar a seção a cada rota nova
              — é isso que faz a animação de entrada (ver legado.css) tocar de
              novo a cada navegação, em vez de só na primeira vez. */}
          <section key={pathname}>
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
}
