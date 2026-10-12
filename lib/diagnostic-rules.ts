import {
  Diagnostic,
  DiagnosticSection,
  actionForPoint,
  assessedSections,
} from "./diagnostic";
import { diagnosticCatalog, optionById } from "./diagnostic-catalog";

export const areaTitle = (id?: string) =>
  diagnosticCatalog.find((a) => a.id === id)?.title || "Plano anterior";
export function executiveSummary(d: Diagnostic) {
  const counts = { pending: 0, good: 0, attention: 0, critical: 0 };
  d.sections.forEach((s) => counts[s.status]++);
  const points = d.sections
    .flatMap((s) =>
      s.points.map((p) => ({
        areaId: s.id,
        point: p,
        evidence:
          p.evidence ||
          (p.observed
            ? `${p.observed} ${p.unit}`.trim()
            : s.images.some((i) => i.pointIds.includes(p.id))
              ? "Print vinculado à área"
              : "Ponto marcado pela gestão; valor não informado"),
      })),
    )
    .sort(
      (a, b) =>
        ({ A: 0, M: 1, B: 2 })[a.point.severity] -
        { A: 0, M: 1, B: 2 }[b.point.severity],
    );
  return {
    counts,
    assessed: assessedSections(d).length,
    total: d.sections.length,
    points,
    priorities: points.slice(0, 3),
  };
}

/** Update only fields still equal to the old generated default; preserve human edits. */
export function actionsAfterAreaEdit(
  d: Diagnostic,
  before: DiagnosticSection,
  after: DiagnosticSection,
) {
  const actions = d.actions
    .filter(
      (a) =>
        a.areaId !== after.id ||
        !a.pointId ||
        after.points.some((p) => p.id === a.pointId),
    )
    .map((a) => {
      const oldPoint = before.points.find((p) => p.id === a.pointId);
      const point = after.points.find((p) => p.id === a.pointId);
      if (a.areaId !== after.id || !oldPoint || !point || a.legacy) return a;
      const old = actionForPoint(before, oldPoint, d.manager),
        next = actionForPoint(after, point, d.manager);
      return {
        ...a,
        title: a.title === old.title ? next.title : a.title,
        description:
          a.description === old.description ? next.description : a.description,
        days: a.days === old.days ? next.days : a.days,
        deadline: a.deadline === old.deadline ? next.deadline : a.deadline,
        priority: next.priority,
      };
    });
  for (const p of after.points)
    if (!before.points.some((old) => old.id === p.id))
      actions.push(actionForPoint(after, p, d.manager));
  return actions;
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function diagnosticWarnings(d: Diagnostic) {
  const warnings: string[] = [];
  const points = d.sections.flatMap((s) => s.points.map((p) => ({ s, p })));
  for (const { s, p } of points)
    if (
      !d.actions.some(
        (a) => a.areaId === s.id && a.pointId === p.id && a.description.trim(),
      )
    )
      warnings.push(`${areaTitle(s.id)}: “${p.title}” está sem ação no plano.`);
  const risk = points.some(
    ({ p }) =>
      optionById.get(p.optionId || "")?.tags.includes("margin-risk") ||
      /margem|roas.*(baixo|negativo)/.test(normalize(p.title)),
  );
  if (risk)
    for (const a of d.actions) {
      const text = normalize(a.description);
      if (
        /(aument|ampli|ativ|criar|oferec|expand|elevar|investir)[^.!?\n]{0,100}(incentiv|cupom|promoc|desconto|verba|orcamento|anuncio)/.test(
          text,
        )
      )
        warnings.push(
          `Revise a ação “${a.title}”: ela pode ampliar incentivos ou investimento enquanto há risco de margem/ROAS. Valide a margem antes de executar.`,
        );
    }
  return warnings;
}
