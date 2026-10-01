export const editorialFonts = [
  '800 64px "Relata Display"',
  '400 14px "Relata Sans"',
  '500 14px "Relata Sans"',
  '600 14px "Relata Sans"',
  '400 11px "Relata Mono"',
] as const;

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
