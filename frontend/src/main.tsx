import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/app/App";

// O style.css do app antigo, inteiro e sem alterações — os tokens do :root
// junto. Conforme cada tela for portada, o pedaço dela sai daqui e vira um
// CSS Module ao lado do componente. Assim a identidade visual não se perde
// no meio da migração.
import "@/styles/legado.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prazo vencendo é informação que não pode estar velha na tela.
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1
    }
  }
});

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Elemento #root não encontrado no index.html");

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
