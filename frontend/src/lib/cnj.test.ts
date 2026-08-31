import { describe, expect, it } from "vitest";
import { ufDaSigla, ufDoNumeroCnj } from "./cnj";

describe("UF deduzida do número CNJ", () => {
  it("lê a Justiça Estadual pelo código do tribunal", () => {
    expect(ufDoNumeroCnj("4001654-36.2025.8.26.0047")).toBe("SP");
    expect(ufDoNumeroCnj("0017898-57.2008.8.16.0185")).toBe("PR");
    expect(ufDoNumeroCnj("0001345-92.2026.8.17.3250")).toBe("PE");
  });

  it("lê a Justiça do Trabalho pela região do TRT", () => {
    expect(ufDoNumeroCnj("0000987-12.2025.5.09.0664")).toBe("PR"); // TRT9
  });

  it("funciona sem a máscara", () => {
    expect(ufDoNumeroCnj("00178985720088160185")).toBe("PR");
  });

  it("não chuta na Justiça Federal, onde um TRF cobre vários estados", () => {
    expect(ufDoNumeroCnj("5001234-56.2025.4.04.7000")).toBeNull();
  });

  it("recusa número incompleto em vez de devolver lixo", () => {
    expect(ufDoNumeroCnj("123")).toBeNull();
    expect(ufDoNumeroCnj("")).toBeNull();
  });
});

describe("UF deduzida da sigla do tribunal", () => {
  it("resolve os tribunais estaduais", () => {
    expect(ufDaSigla("TJPR")).toBe("PR");
    expect(ufDaSigla("tjsp")).toBe("SP");
  });

  it("devolve nulo para o que não é TJ de estado", () => {
    expect(ufDaSigla("TRT9")).toBeNull();
    expect(ufDaSigla("TRF4")).toBeNull();
    expect(ufDaSigla("TJXX")).toBeNull();
    expect(ufDaSigla(null)).toBeNull();
  });
});
