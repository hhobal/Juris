import { Navigate, Route, Routes } from "react-router-dom";
import { useSessao } from "@/lib/queries/sessao";
import { Login } from "@/app/Login";
import { Shell } from "@/app/Shell";
import { PainelPage } from "@/features/painel/PainelPage";
import { BuscaPage } from "@/features/busca/BuscaPage";
import { ProcessosPage } from "@/features/processos/ProcessosPage";
import { TarefasPage } from "@/features/tarefas/TarefasPage";
import { PrazosPage } from "@/features/prazos/PrazosPage";
import { EquipePage } from "@/features/equipe/EquipePage";
import { RelatoriosPage } from "@/features/relatorios/RelatoriosPage";
import { ConfigPage } from "@/features/config/ConfigPage";
import { ResultadosPage } from "@/features/buscaGeral/ResultadosPage";

export function App() {
  const { data: eu, isPending } = useSessao();

  // Enquanto a sessão não resolve, não dá para decidir entre login e app —
  // mostrar qualquer um dos dois causaria um piscar na tela.
  if (isPending) {
    return (
      <div className="login-screen">
        <div className="login-panel">
          <p className="login-hint">Verificando seu acesso…</p>
        </div>
      </div>
    );
  }

  if (!eu) return <Login />;

  return (
    <Routes>
      <Route element={<Shell eu={eu} />}>
        <Route path="/painel" element={<PainelPage eu={eu} />} />
        <Route path="/busca" element={<BuscaPage />} />
        <Route path="/processos" element={<ProcessosPage eu={eu} />} />
        <Route path="/tarefas" element={<TarefasPage eu={eu} />} />
        <Route path="/prazos" element={<PrazosPage eu={eu} />} />
        <Route path="/equipe" element={<EquipePage eu={eu} />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/config" element={<ConfigPage eu={eu} />} />
        <Route path="/resultados" element={<ResultadosPage />} />
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Route>
    </Routes>
  );
}
