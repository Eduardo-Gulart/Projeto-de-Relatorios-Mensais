import { describe, expect, it } from "vitest";
import { deltaState } from "./report-editorial";
describe("direção editorial", () => {
  it("distingue crescimento e queda", () => {
    expect(deltaState(2)).toMatchObject({ symbol: "▲", tone: "positive" });
    expect(deltaState(-2)).toMatchObject({ symbol: "▼", tone: "negative" });
  });
  it("inverte a avaliação de cancelamentos, chamados e taxas", () => {
    expect(deltaState(-2, true)).toMatchObject({
      symbol: "▼",
      tone: "positive",
    });
    expect(deltaState(2, true)).toMatchObject({
      symbol: "▲",
      tone: "negative",
    });
  });
  it("não inventa variações para dados ausentes", () => {
    for (const n of [null, undefined, NaN, Infinity])
      expect(deltaState(n).label).toBe("Comparação não disponível");
    expect(deltaState(0).label).toBe("Sem variação");
  });
});
