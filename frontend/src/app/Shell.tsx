import { useEffect, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSair } from "@/lib/queries/sessao";
import { usePrazos } from "@/lib/queries/prazos";
import { diasAte } from "@/lib/datas";
import { rotuloPapel } from "@/lib/permissoes";
import type { Advogado } from "@/types/dominio";

// Prazos primeiro entre as telas de trabalho: é a razão de o sistema existir.
// "Busca de Processos" desceu — ela hoje só explica por que a funcionalidade
// ainda não existe, e ocupava a segunda posição.
const MENU = [
  { para: "/painel", ico: "◇", texto: "Painel", titulo: "Visão geral do escritório" },
  { para: "/prazos", ico: "◷", texto: "Prazos", titulo: "Nunca mais perca uma data" },
  { para: "/tarefas", ico: "▦", texto: "Quadro de Tarefas", titulo: "Organize o que cada advogado precisa fazer" },
  { para: "/processos", ico: "▤", texto: "Processos", titulo: "Consulte e acompanhe os processos da empresa" },
  { para: "/equipe", ico: "☰", texto: "Equipe", titulo: "Advogados cadastrados na empresa" },
  { para: "/relatorios", ico: "▩", texto: "Relatórios", titulo: "Indicadores do departamento jurídico" },
  { para: "/busca", ico: "⌕", texto: "Busca de Processos", titulo: "Monitoramento automático nos tribunais" },
  { para: "/config", ico: "⚙", texto: "Configurações", titulo: "Empresa e seu acesso" }
];

export function Shell({ eu }: { eu: Advogado }) {
  const sair = useSair();
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
      ? { texto: "Busca", titulo: "Resultados no escritório inteiro" }
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
          <span className="seal">§</span>
          <div>
            <div className="brand-name">Juris</div>
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

      <main className="content">
        <header>
          <div>
            <div className="eyebrow">{atual?.texto}</div>
            <h1>{atual?.titulo}</h1>
          </div>

          <div className="header-right">
            <form className="global-search" onSubmit={buscar}>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar processo, prazo ou tarefa..."
                aria-label="Buscar no escritório inteiro"
              />
            </form>

            <div className="user">
              <span className="avatar" style={{ background: eu.cor }}>
                {eu.iniciais}
              </span>
              <div>
                <strong>{eu.nome}</strong>
                <small>
                  {eu.oab ? `OAB ${eu.oab} · ` : ""}
                  {rotuloPapel(eu.papel)}
                </small>
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

        <section>
          <Outlet />
        </section>
      </main>
    </div>
  );
}
