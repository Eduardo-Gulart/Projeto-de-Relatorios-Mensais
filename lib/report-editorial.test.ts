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
import {
  compactMoney,
  safeRate,
  funnelTransitions,
  percentChange,
  followingMonth,
} from "./report-editorial";
it("formata moeda compacta e preserva ausências", () => {
  expect(compactMoney(29400)).toBe("R$ 29,4 mil");
  expect(compactMoney(0)).toBe("R$ 0,00");
  expect(compactMoney(null)).toBe("NÃO DISPONÍVEL");
  expect(compactMoney(-1200)).toBe("R$ -1,2 mil");
  expect(compactMoney(2300000)).toBe("R$ 2,3 mi");
});
it("protege divisões e taxas inconsistentes", () => {
  expect(safeRate(0, 100)).toBe(0);
  expect(safeRate(1, 0)).toBeNull();
  expect(safeRate(101, 100)).toBeNull();
  expect(percentChange(-100, -50)).toBe(50);
  expect(percentChange(0, 5)).toBeNull();
});
it("calcula taxas etapa a etapa e diferenças em pontos", () => {
  const t = funnelTransitions(
    { visits: 100, views: 80, bag: 40, review: 30, completed: 20 },
    { visits: 100, views: 60, bag: 30, review: 20, completed: 10 },
  );
  expect(t[0]).toMatchObject({ rate: 80, delta: 20 });
  expect(t[1].rate).toBe(50);
  expect(funnelTransitions({}, {}).every((x) => x.rate === null)).toBe(true);
  expect(followingMonth("2026-12")).toBe("2027-01");
});
