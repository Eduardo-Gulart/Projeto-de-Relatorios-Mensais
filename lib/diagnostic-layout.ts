/** Pack measured content without clipping. Whole areas stay together when they fit. */
export function packDiagnosticBlocks(
  blocks: {
    height: number;
    keepNext?: boolean;
    group?: string;
    breakBefore?: boolean;
  }[],
  capacity: number,
) {
  if (!Number.isFinite(capacity) || capacity <= 0)
    throw Error("Área de impressão indisponível.");
  for (const b of blocks)
    if (!Number.isFinite(b.height) || b.height <= 0 || b.height > capacity)
      throw Error(
        "Um bloco do diagnóstico excede a página. Divida o conteúdo em partes menores.",
      );
  const pages: number[][] = [];
  let page: number[] = [],
    used = 0;
  const flush = () => {
    if (page.length) pages.push(page);
    page = [];
    used = 0;
  };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.breakBefore) flush();
    let required = b.height;
    // Keep the complete area only at its first block, if it fits on one sheet.
    if (b.group && blocks[i - 1]?.group !== b.group) {
      let total = 0;
      for (let j = i; j < blocks.length && blocks[j].group === b.group; j++)
        total += blocks[j].height;
      if (total <= capacity) required = total;
    }
    let chain = b.height;
    for (let j = i; blocks[j]?.keepNext && blocks[j + 1]; j++)
      chain += blocks[j + 1].height;
    if (chain <= capacity) required = Math.max(required, chain);
    if (page.length && used + required > capacity) flush();
    page.push(i);
    used += b.height;
  }
  flush();
  return pages;
}

/** Full-width tall prints are sliced, never scaled down or discarded. */
export function diagnosticImageSlices(
  width: number,
  height: number,
  printWidth = 690,
  maxHeight = 650,
) {
  if (
    ![width, height, printWidth, maxHeight].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw Error("Dimensões do print inválidas.");
  const total = (height / width) * printWidth;
  const count = Math.ceil(total / maxHeight),
    size = total / count;
  return Array.from({ length: count }, (_, i) => ({
    top: i * size,
    height: size,
    total,
  }));
}

/** Bound paragraphs for pagination without dropping whitespace or legacy text. */
export function diagnosticParagraphs(text: string): string[] {
  const pieces: string[] = [];
  let remaining = text;
  while (remaining) {
    let end = Math.min(remaining.length, 420);
    const lines = [...remaining.slice(0, end).matchAll(/\n/g)];
    if (lines.length > 6) end = lines[5].index! + 1;
    else if (end < remaining.length) {
      const boundary = remaining.lastIndexOf(" ", end - 1);
      if (boundary > end / 2) end = boundary + 1;
    }
    pieces.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  return pieces;
}
