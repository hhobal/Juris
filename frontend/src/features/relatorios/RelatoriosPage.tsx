import { useProcessos } from "@/lib/queries/processos";
import { usePrazos } from "@/lib/queries/prazos";
import { diasAte } from "@/lib/datas";
import { moeda } from "@/lib/formato";
import type { Processo } from "@/types/dominio";

export function RelatoriosPage() {
  const { data: processos, isPending } = useProcessos();
  const { data: prazos } = usePrazos();

  if (isPending) return <div className="empty-state">Carregando indicadores…</div>;
  if (!processos?.length) {
    return <div className="empty-state">Cadastre processos para os indicadores aparecerem aqui.</div>;
  }

  const contar = (chave: (p: Processo) => string | null) => {
    const mapa = new Map<string, number>();
    for (const p of processos) {
      const k = chave(p) ?? "Não informado";
      mapa.set(k, (mapa.get(k) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  };

  const porTipo = contar((p) => p.tipo);
  const porStatus = contar((p) => p.status);
  const valorTotal = processos.reduce((s, p) => s + p.valorCausa, 0);

  const vencidos = (prazos ?? []).filter((p) => diasAte(p.vencimento) < 0).length;

  return (
    <>
      <div className="cards">
        <div className="card"><span>Processos cadastrados</span><strong>{processos.length}</strong></div>
        <div className="card"><span>Valor somado das causas</span><strong>{moeda(valorTotal)}</strong></div>
        <div className="card"><span>Prazos cadastrados</span><strong>{(prazos ?? []).length}</strong></div>
        <div className="card">
          <span>Prazos vencidos</span>
          <strong className={vencidos > 0 ? "danger" : ""}>{vencidos}</strong>
        </div>
      </div>

      <div className="grid grid-2">
        <Barras titulo="Processos por área do direito" dados={porTipo} />
        <Barras titulo="Processos por situação" dados={porStatus} />
      </div>
    </>
  );
}

function Barras({ titulo, dados }: { titulo: string; dados: [string, number][] }) {
  const max = Math.max(1, ...dados.map((d) => d[1]));
  return (
    <div className="box">
      <div className="box-head"><h2>{titulo}</h2></div>
      {dados.map((d) => (
        <div className="lawyer" key={d[0]}>
          <div className="lawyer-info">
            <strong>{d[0]}</strong>
            <div className="bar"><div style={{ width: `${(d[1] / max) * 100}%` }} /></div>
          </div>
          <span className="lawyer-count">{d[1]}</span>
        </div>
      ))}
    </div>
  );
}
