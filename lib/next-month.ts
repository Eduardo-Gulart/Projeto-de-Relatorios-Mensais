import { Report } from "./report";
export function nextMonth(source: Report): Report {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(source.current))
    throw new Error("Selecione um mês válido.");
  const [year, month] = source.current.split("-").map(Number);
  if (year >= 9999 && month === 12) throw new Error("Período fora do limite.");
  return {
    ...source,
    id: crypto.randomUUID(),
    updated: undefined,
    previous: source.current,
    current: `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`,
    status: "draft",
    qualityPeriod: "",
    strategies: "",
    classification: "",
    summary: undefined,
    notes: undefined,
    actions: undefined,
    nextSteps: undefined,
    targets: { ...source.targets },
    evidence: source.evidence
      .filter((e) => e.category !== "quality" && e.period === source.current)
      .map((e) => ({ ...e, id: crypto.randomUUID(), values: { ...e.values } })),
  };
}
export const storeKey = (s: string) =>
  s.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
