import { describe, it, expect } from "vitest";
import { blank, Report } from "./report";
import {
  insightRows,
  suggestSummary,
  suggestClassification,
  editorialHistory,
} from "./analysis";
import { reportSchema } from "./report-schema";
import { nextMonth } from "./next-month";
describe("análises editoriais", () => {
  it("omite afirmações sem dados e respeita texto manual", () => {
    const r = blank();
    expect(insightRows(r, "sales")).toEqual([]);
    expect(suggestSummary(r)).toBe("");
    expect(suggestClassification(r)).toBe("");
    r.notes = { sales: { AÇÃO: "Texto da gestão" } };
    expect(insightRows(r, "sales")).toEqual([
      { label: "AÇÃO", text: "Texto da gestão" },
    ]);
  });
  it("mantém compatibilidade e preserva campos opcionais no schema de salvamento e restauração", () => {
    const r = { ...blank(), store: "Loja fictícia" };
    expect(reportSchema.parse(r).summary).toBeUndefined();
    const value = {
      ...r,
      summary: "Resumo",
      notes: { quality: { DADO: "Observação" } },
      nextSteps: [{ title: "Revisar", description: "Conferir itens" }],
      layout: "classic",
      includeEvidence: true,
    };
    expect(reportSchema.parse(value)).toEqual(value);
  });
  it("separa lojas por ID e exclui rascunhos do histórico", () => {
    const r = {
      ...blank(),
      storeId: "loja-a",
      store: "Mesmo nome",
      status: "reviewed" as const,
    };
    const other = { ...r, id: crypto.randomUUID(), storeId: "loja-b" };
    expect(editorialHistory(r, [other])).toEqual([]);
    expect(editorialHistory(r, [{ ...r, status: "draft" }])).toEqual([]);
  });
  it("limpa textos mensais ao criar o próximo relatório", () => {
    const r: Report = {
      ...blank(),
      summary: "Antigo",
      notes: { sales: { DADO: "Antigo" } },
      actions: [{ title: "Antigo", description: "Antigo" }],
      nextSteps: [{ title: "Antigo", description: "Antigo" }],
    };
    const next = nextMonth(r);
    expect(next.summary).toBeUndefined();
    expect(next.notes).toBeUndefined();
    expect(next.nextSteps).toBeUndefined();
    expect(next.actions).toBeUndefined();
  });
});
import { opportunityEstimate, actionPages } from "./analysis";
import { editorialFixture } from "./editorial-fixtures";
it("estima oportunidade sem inventar dados nem dividir por zero", () => {
  const { r } = editorialFixture();
  const op = opportunityEstimate(r);
  expect(op?.extra).toBe(100);
  expect(op?.lift).toBe(5);
  expect(opportunityEstimate(blank())).toBeNull();
  r.evidence.find(
    (e) => e.category === "funnel" && e.period === r.current,
  )!.values.bag = 0;
  expect(opportunityEstimate(r)).toBeNull();
});
it("divide planos longos e preserva o conteúdo", () => {
  const item = { title: "Revisão", description: "palavra ".repeat(300).trim() };
  const pages = actionPages([item]);
  expect(pages.length).toBeGreaterThan(1);
  expect(pages.every((p) => p.length <= 5)).toBe(true);
  expect(
    pages
      .flat()
      .map((a) => a.description)
      .join(" "),
  ).toBe(item.description);
});
