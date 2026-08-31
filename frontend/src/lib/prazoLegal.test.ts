import { describe, expect, it } from "vitest";
import { calcularPrazo, ehDiaUtil, feriadosNacionais, noRecesso, primeiroDiaUtil } from "./prazoLegal";

/**
 * Este é o único arquivo do projeto onde um erro faz alguém PERDER PRAZO.
 *
 * Se você mexer em prazoLegal.ts, estes casos precisam continuar passando —
 * e se mudar alguma regra de propósito, o certo é ajustar o caso e explicar
 * no comentário por quê, não apagar o caso.
 *
 * As datas de referência foram conferidas contra o calendário de 2026:
 * a Páscoa cai em 05/04/2026, e é dela que saem carnaval, Sexta-feira Santa
 * e Corpus Christi.
 */

describe("feriados nacionais e forenses", () => {
  const f = feriadosNacionais(2026);

  it("calcula os móveis a partir da Páscoa (05/04/2026)", () => {
    expect(f.has("2026-02-16")).toBe(true); // segunda de carnaval
    expect(f.has("2026-02-17")).toBe(true); // terça de carnaval
    expect(f.has("2026-04-03")).toBe(true); // Sexta-feira Santa
    expect(f.has("2026-06-04")).toBe(true); // Corpus Christi
  });

  it("inclui os fixos, com a Consciência Negra nacional desde 2024", () => {
    expect(f.has("2026-01-01")).toBe(true);
    expect(f.has("2026-04-21")).toBe(true);
    expect(f.has("2026-09-07")).toBe(true);
    expect(f.has("2026-11-20")).toBe(true);
    expect(f.has("2026-12-25")).toBe(true);
  });

  it("não inventa feriado em dia comum", () => {
    expect(f.has("2026-08-26")).toBe(false);
  });

  it("acompanha a Páscoa de outros anos", () => {
    // Páscoa 2027: 28/03. Sexta-feira Santa: 26/03.
    expect(feriadosNacionais(2027).has("2027-03-26")).toBe(true);
    // Páscoa 2025: 20/04. Corpus Christi: 19/06.
    expect(feriadosNacionais(2025).has("2025-06-19")).toBe(true);
  });
});

describe("recesso do art. 220 do CPC", () => {
  it("vai de 20/12 a 20/01, inclusive nas pontas", () => {
    expect(noRecesso("2026-12-19")).toBe(false);
    expect(noRecesso("2026-12-20")).toBe(true);
    expect(noRecesso("2027-01-20")).toBe(true);
    expect(noRecesso("2027-01-21")).toBe(false);
  });
});

describe("dia útil", () => {
  it("descarta fim de semana", () => {
    expect(ehDiaUtil("2026-08-29")).toBe(false); // sábado
    expect(ehDiaUtil("2026-08-30")).toBe(false); // domingo
  });

  it("descarta feriado e recesso", () => {
    expect(ehDiaUtil("2026-09-07")).toBe(false);
    expect(ehDiaUtil("2026-12-26")).toBe(false);
    expect(ehDiaUtil("2027-01-05")).toBe(false);
  });

  it("aceita dia comum", () => {
    expect(ehDiaUtil("2026-08-26")).toBe(true);
    expect(ehDiaUtil("2027-01-21")).toBe(true);
  });
});

describe("primeiro dia útil", () => {
  it("devolve o próprio dia quando ele já é útil", () => {
    expect(primeiroDiaUtil("2026-08-26")).toBe("2026-08-26");
  });

  it("pula o fim de semana e o feriado emendado", () => {
    // 06/09/2026 é domingo e 07/09 é feriado: cai na terça 08/09
    expect(primeiroDiaUtil("2026-09-06")).toBe("2026-09-08");
  });
});

describe("cálculo do vencimento", () => {
  it("segue a cadeia do CPC: disponibilização, publicação, início, contagem", () => {
    // 26/08/2026 é quarta-feira
    const c = calcularPrazo("2026-08-26", 15);
    expect(c.publicacao).toBe("2026-08-27"); // 1º dia útil seguinte (art. 224 §2º)
    expect(c.inicio).toBe("2026-08-28"); // 1º dia útil seguinte à publicação (§3º)
    expect(c.vencimento).toBe("2026-09-18"); // 15 dias úteis, pulando o 7 de setembro
  });

  it("rola o fim de semana quando a disponibilização é numa sexta", () => {
    const c = calcularPrazo("2026-08-28", 5);
    expect(c.publicacao).toBe("2026-08-31"); // segunda
    expect(c.inicio).toBe("2026-09-01"); // terça
    expect(c.vencimento).toBe("2026-09-08");
  });

  it("conta o dia de início como o primeiro dia do prazo", () => {
    const c = calcularPrazo("2026-08-26", 1);
    expect(c.vencimento).toBe(c.inicio);
  });

  it("desconta o recesso e avisa que descontou", () => {
    const c = calcularPrazo("2026-12-15", 15);
    expect(c.vencimento > "2027-01-20").toBe(true);
    expect(c.avisos.some((a) => a.includes("recesso"))).toBe(true);
  });

  it("sempre devolve avisos — o cálculo nunca é certeza", () => {
    const c = calcularPrazo("2026-08-26", 15);
    expect(c.avisos.length).toBeGreaterThan(0);
    expect(c.avisos.some((a) => a.includes("municipais"))).toBe(true);
  });
});
