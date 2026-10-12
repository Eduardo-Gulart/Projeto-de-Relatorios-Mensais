import { describe, it, expect } from "vitest";
import {
  newDiagnostic,
  pointFromOption,
  updateSection,
  actionForPoint,
  diagnosticSchema,
} from "./diagnostic";
import { diagnosticCatalog } from "./diagnostic-catalog";
import {
  actionsAfterAreaEdit,
  executiveSummary,
  diagnosticWarnings,
} from "./diagnostic-rules";
describe("regras do diagnóstico", () => {
  it("calcula status e conta apenas áreas efetivamente avaliadas", () => {
    const d = newDiagnostic();
    d.store = "Teste";
    const a = diagnosticCatalog[0];
    d.sections[0] = updateSection(d.sections[0], { checked: true });
    expect(d.sections[0].status).toBe("good");
    d.sections[1].images = [
      {
        url: "/api/diagnostic-uploads?id=" + crypto.randomUUID(),
        caption: "",
        pointIds: [],
      },
    ];
    expect(executiveSummary(d).assessed).toBe(1);
    d.sections[0] = updateSection(d.sections[0], {
      points: [pointFromOption(a.options.find((o) => o.severity === "M")!.id)],
    });
    expect(d.sections[0].status).toBe("attention");
    expect(d.sections[0].checked).toBe(false);
    expect(
      diagnosticSchema.safeParse({
        ...d,
        sections: [{ ...d.sections[0], status: "good", checked: true }],
      }).success,
    ).toBe(false);
  });
  it("gera prazos 7/30/60, liga cada ação ao ponto e preserva edição manual", () => {
    const d = newDiagnostic();
    for (const severity of ["A", "M", "B"] as const) {
      const area = diagnosticCatalog.find((a) =>
        a.options.some((o) => o.severity === severity),
      )!;
      const before = d.sections.find((s) => s.id === area.id)!;
      const point = pointFromOption(
        area.options.find((o) => o.severity === severity)!.id,
      );
      const after = updateSection(before, { points: [point] });
      const actions = actionsAfterAreaEdit(d, before, after);
      expect(actions[0].days).toBe({ A: 7, M: 30, B: 60 }[severity]);
      expect(actions[0].pointId).toBe(point.id);
      expect(actions[0].areaId).toBe(area.id);
      d.actions = [
        {
          ...actions[0],
          description: "Minha ação revisada",
          deadline: "20/10/2026",
        },
      ];
      expect(
        actionsAfterAreaEdit(d, after, {
          ...after,
          points: [{ ...point, action: "Nova sugestão" }],
        })[0].description,
      ).toBe("Minha ação revisada");
      expect(actionsAfterAreaEdit(d, after, { ...after, points: [] })).toEqual(
        [],
      );
      d.actions = [];
    }
  });
  it("avisa ponto sem ação e incentivo com margem em risco", () => {
    const d = newDiagnostic();
    const area = diagnosticCatalog.find((a) =>
      a.options.some((o) => o.tags.includes("margin-risk")),
    )!;
    const point = pointFromOption(
      area.options.find((o) => o.tags.includes("margin-risk"))!.id,
    );
    const s = d.sections.find((s) => s.id === area.id)!;
    s.points = [point];
    s.status = "critical";
    expect(diagnosticWarnings(d)[0]).toContain("sem ação");
    d.actions = [
      {
        ...actionForPoint(s, point, ""),
        description: "Aumentar os incentivos nas promoções",
      },
    ];
    expect(diagnosticWarnings(d).some((w) => w.includes("margem/ROAS"))).toBe(
      true,
    );
    d.actions[0].description = "Reduzir os incentivos e revisar a margem";
    expect(diagnosticWarnings(d)).toEqual([]);
  });
});
