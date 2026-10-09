/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Diagnostic,
  activeSections,
  diagnosticSections,
  diagnosticStatus,
} from "@/lib/diagnostic";
import {
  guidanceForProblem,
  monitoringForSection,
} from "@/lib/diagnostic-guidance";
import {
  diagnosticParagraphs,
  packDiagnosticBlocks,
} from "@/lib/diagnostic-layout";
import { editorialFonts } from "@/lib/report-editorial";
import { EditorialPage } from "@/app/report-v2/components";
import "./diagnostics.css";

type Block = {
  key: string;
  label: string;
  keepNext?: boolean;
  node: ReactNode;
};
function diagnosticBlocks(d: Diagnostic): Block[] {
  const sections = activeSections(d);
  const blocks: Block[] = [];
  const add = (key: string, label: string, node: ReactNode, keepNext = false) =>
    blocks.push({ key, label, node, keepNext });
  const text = (
    key: string,
    label: string,
    title: string,
    value: string,
    kind = "",
  ) =>
    diagnosticParagraphs(value).forEach((part, i) =>
      add(
        key + i,
        label,
        <div className={"diag-flow-text " + kind}>
          {i === 0 && <h3>{title}</h3>}
          <p>{part}</p>
        </div>,
      ),
    );
  add(
    "intro",
    "Visão geral",
    <div className="diag-flow-intro">
      <div className="diag-flow-eyebrow">Diagnóstico de entrada na gestão</div>
      <h1>{d.store || "Nome da loja"}</h1>
      <div className="diag-flow-meta">
        <span>
          <b>Responsável</b> {d.manager || "Não informado"}
        </span>
        <span>
          <b>Período</b> {d.period || "Não informado"}
        </span>
      </div>
      <div className="diag-flow-counts">
        <span>
          <strong>{sections.length}</strong> áreas avaliadas
        </span>
        <span>
          <strong>
            {
              sections.filter(
                (s) => s.status === "attention" || s.status === "critical",
              ).length
            }
          </strong>{" "}
          áreas em atenção
        </span>
        <span>
          <strong>{sections.reduce((n, s) => n + s.checks.length, 0)}</strong>{" "}
          pontos identificados
        </span>
      </div>
      <p className="diag-flow-method">
        {d.reviewed
          ? "Conferido pela gestão."
          : "Rascunho - conferência pendente."}{" "}
        Os pontos registrados refletem a avaliação informada. Os encaminhamentos
        são sugestões para validação pela equipe; resultados e metas dependem do
        acompanhamento.
      </p>
    </div>,
    true,
  );
  if (d.summary)
    text(
      "summary",
      "Visão geral",
      "Síntese da gestão",
      d.summary,
      "diag-flow-summary",
    );
  sections.forEach((s, index) => {
    const title = diagnosticSections.find((t) => t.id === s.id)!.title;
    const label = String(index + 1).padStart(2, "0") + " / " + title;
    add(
      s.id + "-head",
      label,
      <div className="diag-flow-section">
        <div>
          <small>Área {String(index + 1).padStart(2, "0")}</small>
          <h2>{title}</h2>
        </div>
        <span className={"diag-state diag-state-" + s.status}>
          {diagnosticStatus[s.status]}
        </span>
      </div>,
      true,
    );
    s.images.forEach((image, i) =>
      add(
        s.id + "-image-" + i,
        label,
        <figure className="diag-flow-image">
          <img src={image.url} alt={image.caption || "Print de " + title} />
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>,
        i === s.images.length - 1,
      ),
    );
    s.checks.forEach((check, i) =>
      add(
        s.id + "-check-" + i,
        label,
        <div className="diag-flow-finding">
          <div>
            <small>Ponto identificado {i + 1}</small>
            <h3>{check}</h3>
          </div>
          <div>
            <small>Encaminhamento sugerido</small>
            <p>{guidanceForProblem(s.id, check)}</p>
          </div>
        </div>,
      ),
    );
    if (s.notes) text(s.id + "-notes", label, "Observações da gestão", s.notes);
    if (s.recommendation)
      text(
        s.id + "-recommendation",
        label,
        "Orientação definida pela gestão",
        s.recommendation,
        "diag-flow-recommendation",
      );
    if (s.checks.length)
      add(
        s.id + "-monitor",
        label,
        <div className="diag-flow-monitor">
          <b>Como acompanhar</b>
          <p>
            {monitoringForSection(s.id)} Registrar a data da alteração e
            comparar com a situação anterior, sem mudar várias condições ao
            mesmo tempo.
          </p>
        </div>,
      );
    else if (!s.notes && !s.recommendation)
      add(
        s.id + "-status",
        label,
        <div className="diag-flow-text">
          <p>
            {s.status === "good"
              ? "A gestão não identificou problemas nesta área durante a conferência. Manter o acompanhamento da operação."
              : "Os prints desta área foram anexados. A gestão ainda não detalhou os pontos de análise e as medidas a adotar."}
          </p>
        </div>,
      );
  });
  if (d.actions.length) {
    add(
      "actions-head",
      "Plano de execução",
      <div className="diag-flow-section">
        <div>
          <small>Próximos passos</small>
          <h2>Plano de execução</h2>
        </div>
      </div>,
      true,
    );
    d.actions.forEach((a, i) => {
      const chunks = diagnosticParagraphs(a.description);
      add(
        "action" + i,
        "Plano de execução",
        <article className="diag-flow-action">
          <div className="diag-flow-action-title">
            <h3>
              {String(i + 1).padStart(2, "0")}. {a.title || "Ação proposta"}
            </h3>
            <span className={"diag-priority diag-priority-" + a.priority}>
              {a.priority === "high"
                ? "Alta"
                : a.priority === "medium"
                  ? "Média"
                  : "Baixa"}
            </span>
          </div>
          <p>{chunks[0]}</p>
          <div className="diag-flow-action-meta">
            <span>
              <b>Responsável:</b> {a.owner || "A definir"}
            </span>
            <span>
              <b>Prazo:</b> {a.deadline || "A definir"}
            </span>
          </div>
        </article>,
      );
      chunks.slice(1).forEach((part, j) =>
        add(
          "action" + i + "-rest" + j,
          "Plano de execução",
          <div className="diag-flow-text">
            <h3>{a.title} (continuação)</h3>
            <p>{part}</p>
          </div>,
        ),
      );
    });
  }
  return blocks;
}

export default function DiagnosticDocument({ d }: { d: Diagnostic }) {
  const blocks = useMemo(() => diagnosticBlocks(d), [d]);
  const measure = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    blocks: Block[];
    pages: number[][];
    error?: string;
  } | null>(null);
  const ready = layout?.blocks === blocks;
  const shared = {
    store: d.store || "Nome da loja",
    period: d.date.split("-").reverse().join("/"),
    source: "Diagnóstico de entrada · Análise da gestão · Confidencial",
  };
  useEffect(() => {
    let cancelled = false;
    async function paginate() {
      try {
        const host = measure.current!;
        await Promise.all(
          editorialFonts.map((font) =>
            document.fonts.load(font, "ÁÉÍÓÚÃÕÇ 0123456789"),
          ),
        );
        await document.fonts.ready;
        await Promise.all(
          Array.from(host.querySelectorAll("img")).map((image) =>
            image.decode(),
          ),
        );
        if (cancelled) return;
        const footer = host.querySelector<HTMLElement>(".rv2-footer")!;
        const flow = host.querySelector<HTMLElement>(".diag-flow")!;
        const capacity =
          Math.floor(
            footer.getBoundingClientRect().top -
              24 -
              flow.getBoundingClientRect().top,
          ) - 2;
        const heights = Array.from(
          host.querySelectorAll<HTMLElement>("[data-diag-block]"),
        ).map((el, i) => ({
          height: Math.ceil(el.getBoundingClientRect().height),
          keepNext: blocks[i].keepNext,
        }));
        setLayout({ blocks, pages: packDiagnosticBlocks(heights, capacity) });
      } catch (error) {
        if (!cancelled)
          setLayout({
            blocks,
            pages: [],
            error:
              "Não foi possível organizar o diagnóstico: " +
              (error as Error).message,
          });
      }
    }
    void paginate();
    return () => {
      cancelled = true;
    };
  }, [blocks]);
  const renderBlock = (index: number) => (
    <div
      className="diag-flow-block"
      data-diag-block={blocks[index].key}
      key={blocks[index].key}
    >
      {blocks[index].node}
    </div>
  );
  return (
    <>
      {!ready && <p role="status">Organizando as páginas do diagnóstico…</p>}
      {ready && layout.error && <p role="alert">{layout.error}</p>}
      <div
        className="report-document diag-compact-document"
        id="diagnostic-document"
        data-diagnostic-layout={
          ready ? (layout.error ? "error" : "ready") : "pending"
        }
        data-layout-error={ready ? layout.error : undefined}
      >
        {ready &&
          layout.pages.map((indices, i) => (
            <EditorialPage key={i} {...shared} page={i + 1}>
              <div className="diag-flow-running">
                {i === 0
                  ? "Análise inicial e direcionamento"
                  : blocks[indices[0]].label}
              </div>
              <div className="diag-sheet diag-flow">
                {indices.map(renderBlock)}
              </div>
            </EditorialPage>
          ))}
      </div>
      <div
        ref={measure}
        className="report-document diag-compact-document diag-measure"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -20000,
          top: 0,
          width: 794,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <EditorialPage {...shared} page={1}>
          <div className="diag-flow-running">
            Análise inicial e direcionamento
          </div>
          <div className="diag-sheet diag-flow">
            {blocks.map((_, i) => renderBlock(i))}
          </div>
        </EditorialPage>
      </div>
    </>
  );
}
