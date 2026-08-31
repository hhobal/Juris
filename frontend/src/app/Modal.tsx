import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A moldura de toda janela do sistema.
 *
 * O detalhe que justifica este componente existir: ele renderiza num PORTAL,
 * direto no <body>, e não onde o componente foi escrito na árvore.
 *
 * Sem isso, `position:fixed` não é confiável. Basta um ancestral qualquer ter
 * `transform`, `filter` ou `perspective` para ele virar o bloco de contenção
 * do elemento fixo — que passa a se posicionar em relação AO ANCESTRAL, não à
 * viewport. Foi exatamente o que acontecia aqui: `.content > section` termina
 * a animação de entrada com `transform:translateY(0)` e `fill-mode:both`, o
 * que deixa o transform aplicado para sempre. Toda janela era posicionada
 * dentro da seção. Em tela curta passava despercebido; na Busca, com uma
 * seção de milhares de pixels, a janela era centralizada longe da vista e
 * parecia que o botão não funcionava.
 *
 * No <body> não existe ancestral nenhum para atrapalhar, e o problema deixa de
 * poder acontecer de novo — inclusive se alguém adicionar um transform novo
 * em qualquer lugar da árvore.
 */
export function Modal({ aoFechar, children }: { aoFechar: () => void; children: ReactNode }) {
  // Esc fecha. É o que todo mundo tenta antes de procurar o X.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  // Trava a rolagem do fundo enquanto a janela está aberta, senão a página
  // atrás rola junto com a roda do mouse.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  return createPortal(
    <div
      className="modal-backdrop show"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>,
    document.body
  );
}
