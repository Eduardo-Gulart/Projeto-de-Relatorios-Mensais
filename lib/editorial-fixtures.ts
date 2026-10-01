import { blank, Report, Category } from "./report";
export function editorialFixture(
  mode: "complete" | "missing" | "long" = "complete",
) {
  const r: Report = {
    ...blank(),
    id: "12345678-1234-4234-8234-123456789abc",
    store: "Loja Aurora · exemplo fictício",
    client: "Operação demonstrativa",
    manager: "Gestão de exemplo",
    started: "2026-01-05",
    current: "2026-08",
    previous: "2026-07",
    qualityPeriod: "Junho a agosto de 2026",
    status: "reviewed",
    layout: "editorial",
    summary:
      "Exemplo fictício: o crescimento dos pedidos acompanha o avanço do faturamento líquido. A conversão ficou abaixo da meta e merece revisão. As informações apoiam a priorização das ações, sem demonstrar a causa dos resultados.",
  };
  const vals: Record<Category, Record<string, number>> = {
    finance: {
      gross: 48000,
      fees: -5000,
      promotions: -9000,
      adjustments: 0,
      net: 34000,
    },
    sales: { orders: 1000, salesValue: 42000, ticket: 42, newCustomers: 360 },
    funnel: {
      visits: 6000,
      views: 4800,
      bag: 2400,
      review: 2000,
      completed: 1000,
    },
    quality: { rating: 4.8, cancellations: 1.3, calls: 2.1 },
  };
  for (const category of ["finance", "sales", "funnel", "quality"] as const)
    for (const period of category === "quality"
      ? ["quality"]
      : [r.previous, r.current]) {
      const factor = period === r.previous?.toString() ? 0.8 : 1;
      const data = Object.fromEntries(
        Object.entries(vals[category]).map(([k, v]) => [
          k,
          category === "quality" || k === "ticket" ? v : Math.round(v * factor),
        ]),
      );
      r.evidence.push({
        id: `${category}-${period}`,
        name: "Print fictício",
        category,
        period,
        values: data,
        url: "/report/header.png",
        text: "Fixture fictícia para validação visual",
        confirmed: true,
      });
    }
  if (mode === "missing") {
    r.targets = {};
    r.evidence = r.evidence.filter((e) => e.period !== r.previous);
    r.summary = undefined;
  }
  if (mode === "long") {
    r.summary = "Análise manual de exemplo. ".repeat(24);
    r.nextSteps = Array.from({ length: 7 }, (_, i) => ({
      title: `Ação demonstrativa ${i + 1}`,
      description:
        "Conferir os indicadores, revisar o cardápio e registrar os resultados das alterações para comparação no próximo período. ".repeat(
          8,
        ),
      indicator: "Conversão do cardápio",
      target: "Acompanhar a meta registrada",
    }));
    r.includeEvidence = true;
  }
  const reports =
    mode === "missing"
      ? []
      : Array.from({ length: 5 }, (_, i) => {
          const period = `2026-${String(i + 3).padStart(2, "0")}`;
          return {
            ...r,
            id: `history-${i}`,
            current: period,
            previous: period,
            status: "reviewed" as const,
            evidence: r.evidence
              .filter((e) => e.period === r.current)
              .map((e) => ({
                ...e,
                period,
                values: Object.fromEntries(
                  Object.entries(e.values).map(([k, v]) => [
                    k,
                    v === null ? null : k === "net" ? 23000 + i * 1800 : v,
                  ]),
                ),
              })),
          };
        });
  return { r, reports: [...reports, r] };
}
