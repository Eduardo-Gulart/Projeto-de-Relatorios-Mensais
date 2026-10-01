export const editorialFonts = [
  '800 64px "Relata Display"',
  '400 14px "Relata Sans"',
  '500 14px "Relata Sans"',
  '600 14px "Relata Sans"',
  '400 11px "Relata Mono"',
] as const;

export const finite = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);
export const decimal = (n: number, places = 1) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
export function compactMoney(n: number | null | undefined) {
  if (!finite(n)) return "NÃO DISPONÍVEL";
  const abs = Math.abs(n),
    scale = abs >= 1e6 ? 1e6 : abs >= 1000 ? 1000 : 1;
  return `R$ ${decimal(n / scale, scale === 1 ? 2 : 1)}${scale === 1e6 ? " mi" : scale === 1000 ? " mil" : ""}`;
}
export function safeRate(
  destination: number | null | undefined,
  origin: number | null | undefined,
) {
  return finite(destination) &&
    finite(origin) &&
    origin > 0 &&
    destination >= 0 &&
    destination <= origin
    ? (destination / origin) * 100
    : null;
}
export function percentChange(
  previous: number | null | undefined,
  current: number | null | undefined,
) {
  return finite(previous) && finite(current) && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : null;
}
export function monthLabel(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "Período não informado";
  return new Date(`${period}-02T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function followingMonth(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "";
  const date = new Date(`${period}-02T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 7);
}
export const funnelKeys = [
  "visits",
  "views",
  "bag",
  "review",
  "completed",
] as const;
export function funnelTransitions(
  current: Record<string, number | null>,
  previous: Record<string, number | null>,
) {
  return funnelKeys.slice(1).map((key, index) => {
    const from = funnelKeys[index],
      rate = safeRate(current[key], current[from]),
      before = safeRate(previous[key], previous[from]);
    return {
      from,
      to: key,
      rate,
      previous: before,
      delta: rate !== null && before !== null ? rate - before : null,
    };
  });
}

export function deltaState(value: number | null | undefined, inverse = false) {
  if (value == null || !Number.isFinite(value))
    return {
      symbol: "—",
      tone: "neutral",
      label: "Comparação não disponível",
    } as const;
  if (value === 0)
    return { symbol: "=", tone: "neutral", label: "Sem variação" } as const;
  const good = inverse ? value < 0 : value > 0;
  return {
    symbol: value > 0 ? "▲" : "▼",
    tone: good ? "positive" : "negative",
    label: good ? "Melhora" : "Piora",
  } as const;
}
