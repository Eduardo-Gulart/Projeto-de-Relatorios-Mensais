import { Report, values, money, num } from "./report";
import { actionPlanFor, alertsFor, historyFor } from "./dashboard";
import {
  decimal,
  finite,
  funnelTransitions,
  percentChange,
  safeRate,
} from "./report-editorial";
export const analysisSections = [
  "sales",
  "funnel",
  "quality",
  "costs",
] as const;
export type AnalysisSection = (typeof analysisSections)[number];
export const insightLabels = ["DADO", "LEITURA", "IMPACTO", "AÇÃO"] as const;
export type InsightLabel = (typeof insightLabels)[number];
export type ReportNotes = Partial<
  Record<AnalysisSection, Partial<Record<InsightLabel, string>>>
>;
export type EditorialAction = {
  title: string;
  description: string;
  indicator?: string;
  target?: string;
};
export function insightRows(r: Report, section: AnalysisSection) {
  const f = values(r, "finance", r.current),
    p = values(r, "finance", r.previous),
    s = values(r, "sales", r.current),
    u = values(r, "funnel", r.current),
    q = r.evidence.find((e) => e.category === "quality")?.values || {};
  const rows: Partial<Record<InsightLabel, string>> = {};
  if (section === "sales" && finite(f.net)) {
    rows.DADO = `Faturamento líquido de ${money(f.net)}${finite(s.orders) ? ` e ${num(s.orders)} pedidos` : ""}.`;
    const d = percentChange(p.net, f.net);
    if (d !== null)
      rows.LEITURA = `O líquido ${d >= 0 ? "cresceu" : "caiu"} ${decimal(Math.abs(d))}% frente ao período anterior.`;
    rows.IMPACTO =
      "O líquido é o resultado financeiro informado pelo portal; não equivale ao lucro da operação.";
    rows.AÇÃO =
      "Compare volume de pedidos, ticket e descontos antes de decidir a próxima campanha.";
  }
  if (section === "funnel") {
    const c = safeRate(u.completed, u.visits);
    if (c !== null) {
      rows.DADO = `${num(u.completed)} conclusões em ${num(u.visits)} visitas (${decimal(c)}%).`;
      rows.LEITURA =
        "A passagem entre etapas pode indicar pontos para revisão do cardápio.";
      rows.IMPACTO =
        "Perdas no funil reduzem o aproveitamento das visitas recebidas.";
      rows.AÇÃO =
        "Revise fotos, descrições e oferta na etapa com menor taxa de passagem.";
    }
  }
  if (section === "quality") {
    const available = [
      ["rating", "Avaliação"],
      ["cancellations", "Cancelamentos"],
      ["calls", "Chamados"],
    ].filter(([k]) => finite(q[k]));
    if (available.length) {
      rows.DADO = available
        .map(
          ([k, label]) =>
            `${label}: ${decimal(q[k]!)}${k === "rating" ? "" : "%"}`,
        )
        .join(" · ");
      rows.LEITURA =
        "Indicadores referentes ao período de qualidade informado; não representam uma comparação mensal.";
      rows.IMPACTO =
        "Acompanhar esses indicadores ajuda a priorizar a experiência do cliente.";
      rows.AÇÃO =
        "Leia avaliações e motivos de ocorrências para definir correções com a equipe.";
    }
  }
  if (section === "costs" && (finite(f.fees) || finite(f.promotions))) {
    rows.DADO = [
      finite(f.fees) ? `Taxas e comissões: ${money(f.fees)}.` : "",
      finite(f.promotions)
        ? `Serviços e promoções: ${money(f.promotions)}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    rows.LEITURA =
      "Os descontos reduzem o valor líquido, mas os dados não isolam o retorno de cada promoção.";
    rows.IMPACTO =
      "O faturamento bruto por real em serviços e promoções não mede lucro nem retorno incremental.";
    rows.AÇÃO =
      "Revise os descontos e confira a margem dos produtos antes de ampliar a oferta.";
  }
  return insightLabels.flatMap((label) => {
    const text = r.notes?.[section]?.[label]?.trim() || rows[label];
    return text ? [{ label, text }] : [];
  });
}
export function suggestSummary(r: Report) {
  const f = values(r, "finance", r.current),
    s = values(r, "sales", r.current);
  const items = [
    finite(f.net) ? `O faturamento líquido foi ${money(f.net)}.` : "",
    finite(s.orders) ? `Foram registrados ${num(s.orders)} pedidos.` : "",
    finite(s.ticket) ? `O ticket médio foi ${money(s.ticket)}.` : "",
  ];
  const alert = alertsFor(r)[0];
  if (alert)
    items.push(`Ponto de atenção: ${alert.title.toLocaleLowerCase("pt-BR")}.`);
  return items.filter(Boolean).join(" ");
}
export function suggestClassification(r: Report) {
  if (alertsFor(r).length) return "Precisa de atenção";
  const q = r.evidence.find((e) => e.category === "quality")?.values || {},
    f = values(r, "funnel", r.current),
    p = values(r, "finance", r.previous),
    c = values(r, "finance", r.current);
  return ["rating", "calls", "cancellations"].every(
    (k) => finite(q[k]) && finite(r.targets[k]),
  ) &&
    safeRate(f.completed, f.visits) !== null &&
    finite(r.targets.completed) &&
    percentChange(p.net, c.net) !== null
    ? "Excelente"
    : "";
}
export function suggestAttention(r: Report) {
  return alertsFor(r)
    .slice(0, 3)
    .map((a) => ({ title: a.title, description: a.detail }));
}
export function suggestWins(r: Report) {
  const out: { title: string; description: string }[] = [];
  const a = values(r, "finance", r.previous),
    b = values(r, "finance", r.current),
    d = percentChange(a.net, b.net);
  if (d !== null && d > 0)
    out.push({
      title: "Crescimento do líquido",
      description: `Alta de ${decimal(d)}% no período comparado.`,
    });
  const q = r.evidence.find((e) => e.category === "quality")?.values || {};
  for (const [key, label] of [
    ["rating", "Avaliação"],
    ["cancellations", "Cancelamentos"],
    ["calls", "Chamados"],
  ])
    if (
      finite(q[key]) &&
      finite(r.targets[key]) &&
      (key === "rating" ? q[key]! >= r.targets[key] : q[key]! <= r.targets[key])
    )
      out.push({
        title: `${label} dentro da meta`,
        description: `Resultado ${decimal(q[key]!)}${key === "rating" ? "" : "%"}; meta ${key === "rating" ? "≥" : "≤"} ${decimal(r.targets[key])}${key === "rating" ? "" : "%"}.`,
      });
  return out.slice(0, 3);
}
export function editorialHistory(r: Report, reports: Report[]) {
  return historyFor(reports, r)
    .filter((p) => p.period <= r.current)
    .slice(-6);
}
export function suggestedActions(r: Report): EditorialAction[] {
  return actionPlanFor(r).map((a) => ({
    title: a.title,
    description: a.action,
    indicator: {
      net: "Faturamento líquido",
      conversion: "Conversão do cardápio",
      rating: "Avaliação",
      cancellations: "Cancelamentos",
      calls: "Chamados",
    }[a.kind],
    target:
      a.kind === "net"
        ? "Comparar com o mês anterior"
        : finite(r.targets[a.kind === "conversion" ? "completed" : a.kind])
          ? `${a.kind === "rating" || a.kind === "conversion" ? "Manter ≥" : "Manter ≤"} ${decimal(r.targets[a.kind === "conversion" ? "completed" : a.kind])}${a.kind === "rating" ? "" : "%"}`
          : undefined,
  }));
}

export function opportunityEstimate(r: Report) {
  const f = values(r, "funnel", r.current);
  if (
    !["visits", "views", "bag", "review", "completed"].every(
      (k) => finite(f[k]) && f[k]! > 0,
    )
  )
    return null;
  const transitions = funnelTransitions(f, {});
  if (transitions.some((t) => t.rate === null)) return null;
  const weakest = transitions.reduce((a, b) => (a.rate! <= b.rate! ? a : b));
  const lift = Math.min(5, 100 - weakest.rate!);
  if (lift <= 0) return null;
  const origin = f[weakest.from]!,
    destination = f[weakest.to]!,
    completed = f.completed!;
  return {
    from: weakest.from,
    to: weakest.to,
    rate: weakest.rate!,
    lift,
    extra: Math.round(origin * (lift / 100) * (completed / destination)),
    formula: `${num(origin)} × ${decimal(lift / 100, 2)} × (${num(completed)} ÷ ${num(destination)})`,
  };
}

export function actionPages(items: EditorialAction[]) {
  const fragments: EditorialAction[] = [];
  for (const item of items) {
    const words = item.description.split(/\s+/);
    let part = "";
    let continuation = false;
    for (const word of words) {
      if (part.length + word.length > 370 && part) {
        fragments.push({
          ...item,
          title: item.title + (continuation ? " (continuação)" : ""),
          description: part,
        });
        continuation = true;
        part = "";
      }
      part += (part ? " " : "") + word;
    }
    fragments.push({
      ...item,
      title: item.title + (continuation ? " (continuação)" : ""),
      description: part,
    });
  }
  const pages: EditorialAction[][] = [];
  let page: EditorialAction[] = [],
    cost = 0;
  for (const item of fragments) {
    const size =
      100 +
      Math.ceil(item.description.length / 55) * 17 +
      Math.ceil(item.title.length / 35) * 22;
    if (page.length && (page.length === 5 || cost + size > 650)) {
      pages.push(page);
      page = [];
      cost = 0;
    }
    page.push(item);
    cost += size;
  }
  if (page.length) pages.push(page);
  return pages;
}
