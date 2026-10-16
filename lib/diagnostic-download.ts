import { editorialFonts } from "./report-editorial";

const WIDTH = 794;
const HEIGHT = 1123;
const PRINT_SCALE = Math.min(
  (210 * 96) / 25.4 / WIDTH,
  (297 * 96) / 25.4 / HEIGHT,
);
const TIMEOUT = 30_000;

async function bounded<T>(operation: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), TIMEOUT);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function imagesReady(root: HTMLElement) {
  await bounded(
    Promise.all(
      Array.from(root.querySelectorAll("img")).map(async (image) => {
        try {
          await image.decode();
        } catch {
          throw new Error(
            "Não foi possível carregar um print. Reabra a prévia e tente novamente.",
          );
        }
        if (!image.naturalWidth || !image.naturalHeight)
          throw new Error("Há um print vazio no diagnóstico.");
      }),
    ),
    "O carregamento dos prints demorou mais que o esperado. Reabra a prévia e tente novamente.",
  );
}

async function fontsReady(doc: Document) {
  await bounded(
    Promise.all(
      editorialFonts.map(async (font) => {
        const faces = await doc.fonts.load(font, "ÁÉÍÓÚÃÕÇ 0123456789");
        if (!faces.length || !doc.fonts.check(font))
          throw new Error(
            "Não foi possível carregar uma fonte do diagnóstico. Reabra a prévia.",
          );
      }),
    ),
    "As fontes do diagnóstico ainda não carregaram. Tente novamente.",
  );
  await doc.fonts.ready;
}

/** Refuse a damaged layout instead of exporting a document with clipped content. */
export function assertDiagnosticPages(root: HTMLElement) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".report-page"));
  if (!pages.length)
    throw new Error(
      "O diagnóstico ainda não tem páginas. Abra a prévia antes de exportar.",
    );
  pages.forEach((page, index) => {
    const content = page.querySelector<HTMLElement>(".rv2-content");
    const footer = page.querySelector<HTMLElement>(".rv2-footer");
    const pageBounds = page.getBoundingClientRect();
    const ratio = pageBounds.width / WIDTH || 1;
    const boundary = footer
      ? footer.getBoundingClientRect().top - 20 * ratio
      : pageBounds.top + (HEIGHT - 72) * ratio;
    if (
      !content ||
      content.getBoundingClientRect().bottom > boundary + 1 ||
      content.scrollWidth > content.clientWidth + 2
    )
      throw new Error(
        `O conteúdo da página ${index + 1} ultrapassa a área de impressão. Reabra a prévia para reorganizar o documento.`,
      );
    for (const element of content.querySelectorAll<HTMLElement>("*")) {
      const style =
        element.ownerDocument.defaultView!.getComputedStyle(element);
      if (
        style.display !== "inline" &&
        style.overflowX === "visible" &&
        element.clientWidth > 0 &&
        element.scrollWidth > element.clientWidth + 3
      )
        throw new Error(
          `Há conteúdo largo demais na página ${index + 1}. Revise os valores ou textos dessa área antes de exportar.`,
        );
    }
  });
  return pages;
}

async function ready(root: HTMLElement) {
  if (root.id !== "diagnostic-document")
    throw new Error("Selecione a prévia de um diagnóstico para exportar.");
  const limit = Date.now() + TIMEOUT;
  while (root.dataset.diagnosticLayout === "pending" && Date.now() < limit)
    await new Promise((resolve) => setTimeout(resolve, 60));
  if (root.dataset.diagnosticLayout !== "ready")
    throw new Error(
      root.dataset.layoutError ||
        "Aguarde a organização das páginas do diagnóstico e tente novamente.",
    );
  await fontsReady(root.ownerDocument);
  await imagesReady(root);
  assertDiagnosticPages(root);
}

function frozenClone(source: HTMLElement, targetDocument: Document) {
  const clone = targetDocument.importNode(source, true) as HTMLElement;
  const originals = [
    source,
    ...Array.from(source.querySelectorAll<HTMLElement>("*")),
  ];
  const copies = [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement>("*")),
  ];
  originals.forEach((element, index) => {
    const computed =
      element.ownerDocument.defaultView!.getComputedStyle(element);
    const copy = copies[index];
    if (!copy.style) return;
    // Freeze the already measured screen layout so global @media print rules
    // for monthly reports cannot change diagnostic typography or image sizing.
    for (const name of Array.from(computed))
      copy.style.setProperty(name, computed.getPropertyValue(name));
    copy.style.setProperty("animation", "none");
    copy.style.setProperty("transition", "none");
    if (element.tagName === "IMG")
      (copy as HTMLImageElement).src =
        (element as HTMLImageElement).currentSrc ||
        (element as HTMLImageElement).src;
  });
  clone
    .querySelectorAll("script,iframe,object,embed")
    .forEach((element) => element.remove());
  clone.style.cssText += `;position:relative;left:auto;top:auto;display:block;width:${WIDTH}px;max-width:none;height:auto;margin:0;padding:0;transform:none;background:#fff;`;
  return clone;
}

/**
 * Builds an isolated A4 document with selectable/vector text. The returned
 * iframe is also the exact document used by automated print QA. Call remove()
 * after inspection when using this helper directly.
 */
export async function prepareDiagnosticPrint(
  root: HTMLElement,
): Promise<HTMLIFrameElement> {
  await ready(root);
  document.getElementById("diagnostic-print-frame")?.remove();
  const frame = document.createElement("iframe");
  frame.id = "diagnostic-print-frame";
  frame.title = "Documento de impressão do diagnóstico";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${WIDTH + 40}px;height:${HEIGHT}px;border:0;pointer-events:none;`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(
      '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body></body></html>',
    );
    doc.close();
    doc.title = "Diagnóstico de entrada — Relata";
    const base = doc.createElement("base");
    base.href = document.baseURI;
    doc.head.appendChild(base);
    const stylesLoading: Promise<void>[] = [];
    for (const element of document.head.querySelectorAll(
      "style,link[rel=stylesheet]",
    )) {
      const copy = doc.importNode(element, true) as
        HTMLStyleElement | HTMLLinkElement;
      if (copy.tagName === "LINK") {
        (copy as HTMLLinkElement).href = (element as HTMLLinkElement).href;
        stylesLoading.push(
          new Promise<void>((resolve, reject) => {
            copy.onload = () => resolve();
            copy.onerror = () =>
              reject(
                new Error(
                  "Não foi possível carregar os estilos do diagnóstico.",
                ),
              );
          }),
        );
      }
      doc.head.appendChild(copy);
    }
    const clone = frozenClone(root, doc);
    clone.id = "diagnostic-print-document";
    const pages = Array.from(
      clone.querySelectorAll<HTMLElement>(".report-page"),
    );
    for (const page of pages) {
      const sheet = doc.createElement("div");
      sheet.className = "diagnostic-print-sheet";
      page.replaceWith(sheet);
      sheet.appendChild(page);
      page.style.cssText += `;width:${WIDTH}px;height:${HEIGHT}px;min-height:0;margin:0;transform:none;`;
    }
    doc.body.appendChild(clone);
    const printStyle = doc.createElement("style");
    printStyle.textContent = `
      @page { size: A4 portrait; margin: 0; }
      html, body { display:block!important; margin:0!important; padding:0!important; background:#fff!important; }
      #diagnostic-print-document { max-width:none!important; }
      .diagnostic-print-sheet { position:relative; width:${WIDTH}px; height:${HEIGHT}px; margin:0; padding:0; break-after:page; page-break-after:always; }
      .diagnostic-print-sheet:last-child { break-after:auto; page-break-after:auto; }
      .diagnostic-print-sheet, .diagnostic-print-sheet * { print-color-adjust:exact!important; -webkit-print-color-adjust:exact!important; }
      @media print {
        #diagnostic-print-document { width:210mm!important; }
        .diagnostic-print-sheet { width:210mm!important; height:297mm!important; min-height:297mm!important; max-height:297mm!important; break-inside:avoid; }
        .diagnostic-print-sheet > .report-page { position:absolute!important; left:0!important; top:0!important; transform:scale(${PRINT_SCALE})!important; transform-origin:top left!important; }
      }
    `;
    doc.head.appendChild(printStyle);
    await bounded(
      Promise.all(stylesLoading),
      "Os estilos de impressão ainda não carregaram. Tente novamente.",
    );
    await fontsReady(doc);
    await imagesReady(clone);
    assertDiagnosticPages(clone);
    return frame;
  } catch (error) {
    frame.remove();
    throw error;
  }
}

export async function printDiagnostic(root: HTMLElement) {
  const frame = await prepareDiagnosticPrint(root);
  const printWindow = frame.contentWindow!;
  const cleanup = () => frame.remove();
  printWindow.addEventListener("afterprint", cleanup, { once: true });
  // Keep the document alive for browsers whose print() returns before the
  // dialog closes; subsequent exports also dispose of the previous iframe.
  setTimeout(cleanup, 10 * 60_000);
  try {
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}

/** Raster compatibility fallback. Monthly report exporting remains untouched. */
export async function downloadDiagnostic(filename: string, root: HTMLElement) {
  const frame = await prepareDiagnosticPrint(root);
  try {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const doc = frame.contentDocument!;
    const source = doc.getElementById("diagnostic-print-document")!;
    const pages = assertDiagnosticPages(source);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2,
        width: WIDTH,
        height: HEIGHT,
        windowWidth: WIDTH + 40,
        windowHeight: HEIGHT,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      if (index) pdf.addPage();
      // No per-page size budget or quality degradation for evidence screenshots.
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.96),
        "JPEG",
        0,
        0,
        210,
        297,
        undefined,
        "FAST",
      );
      canvas.width = 0;
      canvas.height = 0;
    }
    pdf.setProperties({
      title: filename,
      subject: "Diagnóstico de entrada na gestão",
      creator: "Relata",
    });
    return {
      url: URL.createObjectURL(pdf.output("blob")),
      filename:
        filename.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9À-ÿ _.-]/g, "-") +
        ".pdf",
    };
  } finally {
    frame.remove();
  }
}
