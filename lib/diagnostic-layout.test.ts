import { describe, expect, it } from "vitest";
import {
  diagnosticParagraphs,
  packDiagnosticBlocks,
} from "./diagnostic-layout";
import { guidanceForProblem, monitoringForOption } from "./diagnostic-guidance";
import { diagnosticSections } from "./diagnostic";

describe("continuous diagnostic pagination", () => {
  it("balances a sparse final page without changing content order", () => {
    expect(
      packDiagnosticBlocks(
        [200, 200, 200, 200, 200, 100].map((height) => ({ height })),
        900,
      ),
    ).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
  it("shares pages between sections without leaving an orphan heading", () => {
    expect(
      packDiagnosticBlocks(
        [
          { height: 100 },
          { height: 30, keepNext: true },
          { height: 60 },
          { height: 30, keepNext: true },
          { height: 60 },
        ],
        200,
      ),
    ).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
  });
  it("keeps the final screenshot with the first analysis when they fit", () => {
    expect(
      packDiagnosticBlocks(
        [
          { height: 300 },
          { height: 250, keepNext: true },
          { height: 100 },
          { height: 60 },
        ],
        500,
      ),
    ).toEqual([[0], [1, 2, 3]]);
  });
  it("preserves every block in order and never exceeds available height", () => {
    for (let seed = 1; seed < 50; seed++) {
      const blocks = Array.from({ length: 30 }, (_, i) => ({
        height: 20 + ((seed * i * 17) % 250),
        keepNext: i % 5 === 0,
      }));
      const pages = packDiagnosticBlocks(blocks, 850);
      expect(pages.flat()).toEqual(blocks.map((_, i) => i));
      pages.forEach((page) =>
        expect(
          page.reduce((n, i) => n + blocks[i].height, 0),
        ).toBeLessThanOrEqual(850),
      );
    }
  });
  it("rejects oversized content rather than silently clipping it", () =>
    expect(() => packDiagnosticBlocks([{ height: 900 }], 850)).toThrow());
  it("preserves long text and explicit line breaks", () => {
    for (const text of [
      "Texto extenso ".repeat(100),
      "Observação\n".repeat(90),
      "x".repeat(900),
    ]) {
      const chunks = diagnosticParagraphs(text);
      expect(chunks.join("")).toBe(text);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(900);
        expect((chunk.match(/\n/g) || []).length).toBeLessThanOrEqual(6);
      });
    }
  });
  it("provides specific guidance for every selectable problem without inferring findings", () => {
    for (const section of diagnosticSections) {
      const suggestions = section.checks.map((check) =>
        guidanceForProblem(section.options.find((o) => o.text === check)!.id),
      );
      expect(new Set(suggestions).size).toBe(section.checks.length);
      expect(monitoringForOption(section.options[0].id).length).toBeGreaterThan(
        2,
      );
    }
    expect(guidanceForProblem("Observação antiga")).toContain(
      "Defina o encaminhamento",
    );
  });
});
