import { useEffect, useState } from "react";

/**
 * Tema visual do app — puramente de interface, não é dado do escritório.
 * Persistido no navegador de quem usa, não no banco: cada pessoa escolhe o
 * seu. O `index.html` já aplica o valor salvo antes do React montar, para a
 * tela não piscar no tema errado ao carregar.
 */
export type Tema = "escuro" | "claro";

const CHAVE = "juris-tema";

function lido(): Tema {
  try {
    return localStorage.getItem(CHAVE) === "claro" ? "claro" : "escuro";
  } catch {
    return "escuro";
  }
}

function aplicar(tema: Tema) {
  if (tema === "claro") document.documentElement.setAttribute("data-theme", "claro");
  else document.documentElement.removeAttribute("data-theme");
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(lido);

  useEffect(() => {
    aplicar(tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      // Sem storage disponível (modo privado, por ex.): o tema só não
      // sobrevive a um recarregamento — não é motivo para quebrar a tela.
    }
  }, [tema]);

  return {
    tema,
    alternar: () => setTema((t) => (t === "claro" ? "escuro" : "claro"))
  };
}
