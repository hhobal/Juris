import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSair } from "@/lib/queries/sessao";
import { usePrazos } from "@/lib/queries/prazos";
import { diasAte } from "@/lib/datas";
import { rotuloPapel } from "@/lib/permissoes";
import type { Advogado } from "@/types/dominio";

const MENU = [
  { para: "/painel", ico: "◇", texto: "Painel", titulo: "Visão geral do escritório" },
  { para: "/busca", ico: "⌕", texto: "Busca de Processos", titulo: "Monitoramento automático nos tribunais" },
  { para: "/processos", ico: "▤", texto: "Processos", titulo: "Consulte e acompanhe os processos da empresa" },
  { para: "/tarefas", ico: "▦", texto: "Quadro de Tarefas", titulo: "Organize o que cada advogado precisa fazer" },
  { para: "/prazos", ico: "◷", texto: "Prazos", titulo: "Nunca mais perca uma data" },
  { para: "/equipe", ico: "☰", texto: "Equipe", titulo: "Advogados cadastrados na empresa" },
  { para: "/relatorios", ico: "▩", texto: "Relatórios", titulo: "Indicadores do departamento jurídico" },
  { para: "/config", ico: "⚙", texto: "Configurações", titulo: "Empresa e seu acesso" }
];

export function Shell({ eu }: { eu: Advogado }) {
  const sair = useSair();
  const { data: prazos } = usePrazos();
  const { pathname } = useLocation();

  const atual = MENU.find((m) => m.para === pathname) ?? MENU[0];

  const naSemana =
    prazos?.filter((p) => {
      const d = diasAte(p.vencimento);
      return d >= 0 && d <= 7;
    }).length ?? 0;

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
              className={({ isActive }) => (isActive ? "menu active" : "menu")}
            >
              <span className="ico">{item.ico}</span>
              {item.texto}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-stat">
            <span>{naSemana}</span>
            <small>prazos nos próx. 7 dias</small>
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
