import { z } from "zod";
import {
  diagnosticCatalog,
  optionById,
  textToOptionId,
  rangeDefaults,
  type Severity,
} from "./diagnostic-catalog";
import {
  guidanceForProblem as legacyGuidance,
  monitoringForSection as legacyMonitoring,
} from "./diagnostic-legacy-guidance";
export const diagnosticSections = diagnosticCatalog.map((area) => ({
  ...area,
  checks: area.options.map((o) => o.text),
  hint: "Marque os pontos e anexe a evidência da área.",
  action: "Conferir os pontos identificados e acompanhar os indicadores.",
}));
export const diagnosticStatus = {
  pending: "Não avaliado",
  good: "Adequado",
  attention: "Precisa de atenção",
  critical: "Prioridade alta",
} as const;
const severity = z.enum(["A", "M", "B"]);
const pointSchema = z.object({
  id: z.string().min(1).max(180),
  optionId: z.string().max(180).optional(),
  title: z.string().min(1).max(180),
  severity,
  evidence: z.string().max(2500),
  action: z.string().max(2500),
  kpi: z.string().max(250),
  observed: z.string().max(120),
  unit: z.string().max(20),
  baseline: z.string().max(120),
  target: z.string().max(120),
  legacy: z.boolean().optional(),
});
export type DiagnosticPoint = z.infer<typeof pointSchema>;
const imageSchema = z.object({
  url: z.string().regex(/^\/api\/diagnostic-uploads\?id=[a-zA-Z0-9-]{36}$/),
  caption: z.string().max(160),
  pointIds: z.array(z.string().max(180)).max(150).default([]),
  width: z.number().int().positive().max(30000).optional(),
  height: z.number().int().positive().max(30000).optional(),
  redacted: z.boolean().optional(),
});
const sectionSchema = z.object({
  id: z.string().max(30),
  status: z.enum(["pending", "good", "attention", "critical"]),
  checked: z.boolean(),
  points: z.array(pointSchema).max(150),
  images: z.array(imageSchema).max(6),
});
export type DiagnosticSection = z.infer<typeof sectionSchema>;
const actionSchema = z.object({
  id: z.string().min(1).max(220),
  areaId: z.string().max(30).optional(),
  pointId: z.string().max(180).optional(),
  title: z.string().max(250),
  description: z.string().max(2500),
  priority: z.enum(["high", "medium", "low"]),
  owner: z.string().max(100),
  deadline: z.string().max(120),
  days: z.union([z.literal(7), z.literal(30), z.literal(60)]),
  legacy: z.boolean().optional(),
});
export const diagnosticSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string().uuid(),
    store: z.string().trim().min(1).max(100),
    manager: z.string().max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period: z.string().max(100),
    summary: z.string().max(2500).default(""),
    sections: z.array(sectionSchema).min(1).max(30),
    actions: z.array(actionSchema).max(300),
    rangePresets: z
      .record(z.array(z.string().min(1).max(100)).max(8))
      .default({}),
    reviewed: z.boolean(),
    migration: z
      .object({ from: z.literal(1), needsReview: z.boolean() })
      .optional(),
  })
  .superRefine((d, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (new Set(d.sections.map((s) => s.id)).size !== d.sections.length)
      issue("Há áreas duplicadas.");
    if (d.sections.some((s) => !diagnosticCatalog.some((a) => a.id === s.id)))
      issue("Área desconhecida.");
    for (const s of d.sections) {
      if (s.status !== statusForSection(s))
        issue("Status incompatível com os pontos marcados.");
      if (s.checked && s.points.length)
        issue("Uma área com pontos não pode ser marcada como adequada.");
      if (new Set(s.points.map((p) => p.id)).size !== s.points.length)
        issue("Há pontos duplicados.");
      for (const p of s.points)
        if (p.optionId) {
          const option = optionById.get(p.optionId);
          if (
            !option ||
            !diagnosticCatalog
              .find((a) => a.id === s.id)
              ?.options.some((o) => o.id === p.optionId) ||
            p.id !== p.optionId ||
            p.severity !== option.severity
          )
            issue("Opção ou severidade inválida para a área.");
        }
      for (const image of s.images)
        if (image.pointIds.some((id) => !s.points.some((p) => p.id === id)))
          issue("Print vinculado a um ponto inexistente.");
    }
    if (new Set(d.actions.map((a) => a.id)).size !== d.actions.length)
      issue("Há ações duplicadas.");
    for (const a of d.actions)
      if (
        a.pointId &&
        !d.sections.some(
          (s) => s.id === a.areaId && s.points.some((p) => p.id === a.pointId),
        )
      )
        issue("Ação vinculada a um ponto inexistente.");
  });
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type SavedDiagnostic = Diagnostic & { updated: string };
export function statusForSection(
  s: Pick<DiagnosticSection, "points" | "checked">,
): DiagnosticSection["status"] {
  return s.points.some((p) => p.severity === "A")
    ? "critical"
    : s.points.length
      ? "attention"
      : s.checked
        ? "good"
        : "pending";
}
export function updateSection(
  s: DiagnosticSection,
  patch: Partial<DiagnosticSection>,
): DiagnosticSection {
  const next = { ...s, ...patch };
  if (next.points.length) next.checked = false;
  next.status = statusForSection(next);
  next.images = next.images.map((image) => ({
    ...image,
    pointIds: image.pointIds.filter((id) =>
      next.points.some((p) => p.id === id),
    ),
  }));
  return next;
}
export function pointFromOption(id: string): DiagnosticPoint {
  const o = optionById.get(id);
  if (!o) throw Error("Opção desconhecida.");
  return {
    id: o.id,
    optionId: o.id,
    title: o.text,
    severity: o.severity,
    evidence: "",
    action: o.action,
    kpi: o.kpi,
    observed: "",
    unit: o.quickValue ? rangeDefaults[o.quickValue].unit : "",
    baseline: "",
    target: "",
  };
}
export function newOtherPoint(): DiagnosticPoint {
  return {
    id: "other-" + crypto.randomUUID(),
    title: "Outro ponto",
    severity: "M",
    evidence: "",
    action: "",
    kpi: "",
    observed: "",
    unit: "",
    baseline: "",
    target: "",
  };
}
export function newDiagnostic(): Diagnostic {
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    store: "",
    manager: "",
    date: new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    }),
    period: "",
    summary: "",
    sections: diagnosticCatalog.map((a) => ({
      id: a.id,
      status: "pending",
      checked: false,
      points: [],
      images: [],
    })),
    actions: [],
    rangePresets: {},
    reviewed: false,
  };
}
export function activeSections(d: Diagnostic) {
  return d.sections.filter(
    (s) => s.status !== "pending" || s.points.length || s.images.length,
  );
}
export function assessedSections(d: Diagnostic) {
  return d.sections.filter((s) => s.status !== "pending");
}
export function toggleDiagnosticProblem(
  s: DiagnosticSection,
  id: string,
  enabled: boolean,
) {
  const optionId = optionById.has(id) ? id : textToOptionId.get(id);
  if (!optionId) throw Error("Opção desconhecida.");
  const points = enabled
    ? s.points.some((p) => p.id === optionId)
      ? s.points
      : [...s.points, pointFromOption(optionId)]
    : s.points.filter((p) => p.id !== optionId);
  const next = updateSection(s, { points, checked: false });
  next.images = next.images.map((i) => ({
    ...i,
    pointIds: points.map((p) => p.id),
  }));
  return next;
}
export function actionForPoint(
  s: DiagnosticSection,
  p: DiagnosticPoint,
  manager: string,
): Diagnostic["actions"][number] {
  const days = p.severity === "A" ? 7 : p.severity === "M" ? 30 : 60;
  return {
    id: "action:" + p.id,
    areaId: s.id,
    pointId: p.id,
    title: p.title,
    description: p.action,
    priority:
      p.severity === "A" ? "high" : p.severity === "M" ? "medium" : "low",
    owner: manager,
    deadline: days + " dias",
    days,
  };
}
export function suggestedDiagnosticActions(d: Diagnostic) {
  return d.sections
    .flatMap((s) => s.points.map((p) => actionForPoint(s, p, d.manager)))
    .sort((a, b) => a.days - b.days);
}
export function diagnosticReady(d: Diagnostic) {
  return Boolean(
    d.store.trim() &&
    d.manager.trim() &&
    d.date &&
    assessedSections(d).length &&
    d.reviewed &&
    d.sections.every((s) =>
      s.points.every((p) => p.title.trim() && p.action.trim()),
    ),
  );
}

const legacySchema = z.object({
  id: z.string().uuid(),
  store: z.string(),
  manager: z.string(),
  date: z.string(),
  period: z.string(),
  summary: z.string().default(""),
  reviewed: z.boolean().default(false),
  sections: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      checks: z.array(z.string()),
      notes: z.string(),
      recommendation: z.string(),
      images: z.array(z.object({ url: z.string(), caption: z.string() })),
    }),
  ),
  actions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      owner: z.string(),
      deadline: z.string(),
    }),
  ),
});
/** Pure read migration. No D1 writes; the next explicit save stores schemaVersion 2. */
export function normalizeDiagnostic(input: unknown): Diagnostic {
  const v = input as { schemaVersion?: number };
  if (v.schemaVersion === 2) {
    const parsed = diagnosticSchema.parse(input);
    return {
      ...parsed,
      sections: diagnosticCatalog.map(
        (a) =>
          parsed.sections.find((s) => s.id === a.id) || {
            id: a.id,
            status: "pending" as const,
            checked: false,
            points: [],
            images: [],
          },
      ),
    };
  }
  if (v.schemaVersion !== undefined && v.schemaVersion !== 1)
    throw Error("Versão de diagnóstico não suportada.");
  const old = legacySchema.parse(input);
  const d = newDiagnostic();
  Object.assign(d, {
    id: old.id,
    store: old.store,
    manager: old.manager,
    date: old.date,
    period: old.period,
    summary: old.summary,
    reviewed: false,
    migration: { from: 1, needsReview: true },
  });
  for (const oldSection of old.sections) {
    const s = d.sections.find((s) => s.id === oldSection.id);
    if (!s) throw Error("Área antiga desconhecida: " + oldSection.id);
    for (const [index, text] of oldSection.checks.entries()) {
      const optionId = textToOptionId.get(text);
      const point =
        optionId && !s.points.some((p) => p.id === optionId)
          ? pointFromOption(optionId)
          : {
              ...newOtherPoint(),
              id: `legacy-${s.id}-${index}`,
              title: text,
              severity: (oldSection.status === "critical"
                ? "A"
                : "M") as Severity,
            };
      point.title = text;
      point.action = legacyGuidance(s.id, text);
      point.kpi = legacyMonitoring(s.id);
      point.legacy = true;
      s.points.push(point);
    }
    if (oldSection.notes || oldSection.recommendation)
      s.points.push({
        ...newOtherPoint(),
        id: `legacy-${s.id}-notes`,
        title: "Registro anterior da gestão",
        severity: oldSection.status === "critical" ? "A" : "M",
        evidence: oldSection.notes,
        action: oldSection.recommendation,
        kpi: legacyMonitoring(s.id),
        legacy: true,
      });
    if (
      !s.points.length &&
      ["attention", "critical"].includes(oldSection.status)
    )
      s.points.push({
        ...newOtherPoint(),
        id: `legacy-${s.id}-status`,
        title: "Situação registrada no diagnóstico anterior",
        severity: oldSection.status === "critical" ? "A" : "M",
        evidence:
          oldSection.status === "critical"
            ? "Prioridade alta informada pela gestão anterior; detalhamento pendente."
            : "Atenção informada pela gestão anterior; detalhamento pendente.",
        action: "",
        kpi: legacyMonitoring(s.id),
        legacy: true,
      });
    s.checked = oldSection.status === "good" && !s.points.length;
    s.status = statusForSection(s);
    s.images = oldSection.images.map((i) => ({
      ...i,
      pointIds: s.points.map((p) => p.id),
    }));
  }
  d.actions = old.actions.map((a, i) => ({
    id: "legacy-action-" + i,
    ...a,
    days: a.priority === "high" ? 7 : a.priority === "medium" ? 30 : 60,
    legacy: true,
  }));
  return diagnosticSchema.parse(d);
}
