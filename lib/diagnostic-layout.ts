/** Pack measured blocks, preserving order and avoiding isolated headings. */
export function packDiagnosticBlocks(
  blocks: { height: number; keepNext?: boolean }[],
  capacity: number,
) {
  if (!Number.isFinite(capacity) || capacity <= 0)
    throw new Error("Área de impressão indisponível.");
  const pages: number[][] = [];
  let page: number[] = [],
    used = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (
      !Number.isFinite(block.height) ||
      block.height <= 0 ||
      block.height > capacity
    )
      throw new Error(
        "Um bloco do diagnóstico excede a página. Divida o texto em parágrafos menores.",
      );
    let groupHeight = block.height;
    for (let j = i; blocks[j]?.keepNext && blocks[j + 1]; j++)
      groupHeight += blocks[j + 1].height;
    // An oversized group may break, but no individual block is ever clipped.
    const required = groupHeight <= capacity ? groupHeight : block.height;
    if (page.length && used + required > capacity) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(i);
    used += block.height;
  }
  if (page.length) pages.push(page);
  // Avoid a nearly empty final sheet while keeping earlier pages well filled.
  if (pages.length > 1) {
    const previous = pages[pages.length - 2],
      last = pages[pages.length - 1];
    const height = (indices: number[]) =>
      indices.reduce((sum, index) => sum + blocks[index].height, 0);
    if (height(last) < capacity * 0.35) {
      while (height(last) < capacity * 0.45 && previous.length > 1) {
        let start = previous.length - 1;
        while (start > 0 && blocks[previous[start - 1]].keepNext) start--;
        const tail = previous.slice(start),
          tailHeight = height(tail);
        if (
          !start ||
          height(previous) - tailHeight < capacity * 0.55 ||
          height(last) + tailHeight > capacity
        )
          break;
        previous.splice(start);
        last.unshift(...tail);
      }
    }
  }
  return pages;
}

/** Bound paragraphs for pagination without dropping whitespace or legacy text. */
export function diagnosticParagraphs(text: string): string[] {
  const pieces: string[] = [];
  let remaining = text;
  while (remaining) {
    let end = Math.min(remaining.length, 900);
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
