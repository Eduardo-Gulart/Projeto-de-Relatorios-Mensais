import { editorialFonts } from "./report-editorial";
const PAPER_WIDTH = 794;
const PAPER_HEIGHT = 1123;
function overflow(page: HTMLElement) {
  if (page.dataset.reportLayout === "editorial") {
    const content = page.querySelector<HTMLElement>(".rv2-content");
    const footer = page.querySelector<HTMLElement>(".rv2-footer");
    const boundary = footer
      ? footer.getBoundingClientRect().top - 24
      : page.getBoundingClientRect().top + PAPER_HEIGHT - 40;
    return (
      !!content &&
      (content.getBoundingClientRect().bottom > boundary ||
        content.scrollWidth > content.clientWidth + 1 ||
        Array.from(content.querySelectorAll<HTMLElement>("*")).some(
          (el) =>
            el.scrollWidth > el.clientWidth + 2 &&
            getComputedStyle(el).display !== "inline",
        ))
    );
  }
  const content = page.querySelector<HTMLElement>(".report-page-content");
  return (
    !!content &&
    content.getBoundingClientRect().bottom >
      page.getBoundingClientRect().top + PAPER_HEIGHT - 72 + 0.5
  );
}
function makeContinuation(root: HTMLElement, original: HTMLElement) {
  const page = document.createElement("div");
  page.className = "report-page page-strategies";
  page.style.height = PAPER_HEIGHT + "px";
  const content = document.createElement("div");
  content.className = "report-page-content";
  const header = original.querySelector(".report-running-head");
  if (header) content.appendChild(header.cloneNode(true));
  const area = document.createElement("div");
  area.className = "report-strategies";
  const heading = document.createElement("h3");
  heading.className = "report-subheading";
  heading.textContent = "Estratégias utilizadas (continuação)";
  const list = document.createElement("ul");
  area.appendChild(heading);
  area.appendChild(list);
  content.appendChild(area);
  page.appendChild(content);
  const footer = original.querySelector(".report-footer");
  if (footer) page.appendChild(footer.cloneNode(true));
  root.appendChild(page);
  return { page, list, content };
}
function preparePages(root: HTMLElement) {
  for (const page of root.querySelectorAll<HTMLElement>(".report-page"))
    page.style.height = PAPER_HEIGHT + "px";
  const original = root.querySelector<HTMLElement>(".page-strategies"),
    list = original?.querySelector("ul");
  if (original && list) {
    const queue: HTMLElement[] = [];
    const notes = Array.from(
      original.querySelectorAll<HTMLElement>(
        ".report-method-note,.report-draft",
      ),
    );
    notes.forEach((n) => n.remove());
    while (overflow(original) && list.lastElementChild) {
      const item = list.lastElementChild as HTMLElement;
      queue.unshift(item);
      item.remove();
    }
    let last = original;
    while (queue.length) {
      const next = makeContinuation(root, original);
      last = next.page;
      while (queue.length) {
        const item = queue.shift()!;
        next.list.appendChild(item);
        if (!overflow(next.page)) continue;
        item.remove();
        if (next.list.childElementCount) {
          queue.unshift(item);
          break;
        }
        const words = (item.textContent || "").split(/\s+/);
        let lo = 1,
          hi = words.length - 1,
          best = 0;
        next.list.appendChild(item);
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          item.textContent = words.slice(0, mid).join(" ");
          if (!overflow(next.page)) {
            best = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        if (!best)
          throw new Error(
            "Uma observação não cabe na página. Divida-a em parágrafos menores.",
          );
        item.textContent = words.slice(0, best).join(" ");
        const rest = document.createElement("li");
        rest.textContent = words.slice(best).join(" ");
        queue.unshift(rest);
        break;
      }
    }
    if (!list.children.length && last !== original) {
      const info = document.createElement("p");
      info.textContent =
        "As estratégias registradas são apresentadas na página seguinte.";
      list.replaceWith(info);
    }
    const content = last.querySelector(".report-page-content")!;
    notes.forEach((n) => content.appendChild(n));
    if (overflow(last)) {
      notes.forEach((n) => n.remove());
      const extra = makeContinuation(root, original);
      extra.list.parentElement!.remove();
      const h = document.createElement("h3");
      h.className = "report-subheading";
      h.textContent = "Notas do relatório";
      extra.content.appendChild(h);
      notes.forEach((n) => extra.content.appendChild(n));
    }
  }
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".report-page"));
  for (const [i, page] of pages.entries()) {
    const number = page.querySelector(".page-number");
    if (number)
      number.textContent = `${String(i + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}`;
    if (overflow(page))
      throw new Error(
        `O conteúdo da página ${i + 1} ultrapassa a área de impressão. Revise os textos longos antes de exportar.`,
      );
  }
}
export async function downloadReport(
  filename: string,
  selector = ".app-ui .report-document",
) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const source = document.querySelector(selector);
  if (!source) throw new Error("Abra a prévia antes de baixar o PDF.");
  const root = source.cloneNode(true) as HTMLElement;
  root.className = "report-document export-root";
  root.style.cssText = `position:absolute;left:-10000px;top:0;width:${PAPER_WIDTH}px;max-width:none;background:white;color:#202d3a;`;
  document.body.appendChild(root);
  try {
    await Promise.all(
      Array.from(root.querySelectorAll("img")).map(async (img) => {
        try {
          await img.decode();
        } catch {
          throw new Error(
            "Não foi possível carregar uma imagem do relatório. Recarregue a prévia e tente novamente.",
          );
        }
      }),
    );
    await document.fonts.ready;
    if (root.querySelector("[data-report-layout=editorial]")) {
      for (const font of editorialFonts) {
        try {
          const loaded = await document.fonts.load(font, "ÁÉÍÓÚÃÕÇ 0123456789");
          if (!loaded.length || !document.fonts.check(font)) throw new Error();
        } catch {
          throw new Error(
            "Não foi possível carregar a fonte " +
              font +
              ". Recarregue a prévia antes de exportar.",
          );
        }
      }
    }
    preparePages(root);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    let first = true;
    for (const page of root.querySelectorAll<HTMLElement>(".report-page")) {
      if (page.dataset.reportLayout === "editorial") {
        const canvas = await html2canvas(page, {
          scale: 2,
          width: PAPER_WIDTH,
          height: PAPER_HEIGHT,
          backgroundColor: getComputedStyle(page).backgroundColor,
          useCORS: true,
          windowWidth: 1400,
          logging: false,
        });
        if (!first) pdf.addPage();
        first = false;
        const pageBudget =
          2_800_000 / root.querySelectorAll(".report-page").length;
        let image = canvas.toDataURL("image/jpeg", 0.92);
        for (const quality of [0.86, 0.8, 0.74, 0.68, 0.58, 0.48]) {
          if (image.length * 0.75 <= pageBudget) break;
          image = canvas.toDataURL("image/jpeg", quality);
        }
        pdf.addImage(image, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        continue;
      }
      const head = page.querySelector<HTMLElement>(".report-running-head");
      const footer = page.querySelector<HTMLElement>(".report-footer");
      const leftHead = head?.children[0]?.textContent || "",
        rightHead = head?.children[1]?.textContent || "",
        leftFooter = footer?.children[0]?.textContent || "",
        rightFooter = footer?.children[1]?.textContent || "";
      for (const el of [
        ...Array.from(head?.children || []),
        ...Array.from(footer?.children || []),
      ])
        (el as HTMLElement).style.visibility = "hidden";
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        windowWidth: 1400,
        logging: false,
      });
      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.98),
        "JPEG",
        0,
        0,
        210,
        297,
      );
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor("#273644");
      pdf.text(leftHead.toUpperCase(), 11.64, 14.7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor("#697684");
      pdf.text(rightHead.toUpperCase(), 198.36, 14.7, { align: "right" });
      pdf.setFontSize(7.5);
      const footerLines = pdf.splitTextToSize(leftFooter, 166) as string[];
      if (footerLines.length > 2) {
        footerLines.splice(2);
        footerLines[1] = footerLines[1].replace(/.{3}$/, "...");
      }
      pdf.text(footerLines, 11.64, 287.4);
      pdf.text(rightFooter, 198.36, 287.4, { align: "right" });
    }
    pdf.setProperties({
      title: filename,
      subject: "Relatório mensal de desempenho comercial",
      creator: "Relata",
    });
    return {
      url: URL.createObjectURL(pdf.output("blob")),
      filename: filename.replace(/[^a-zA-Z0-9À-ÿ _.-]/g, "-") + ".pdf",
    };
  } finally {
    root.remove();
  }
}
