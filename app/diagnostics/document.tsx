"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Diagnostic, diagnosticStatus } from "@/lib/diagnostic";
import {
  executiveSummary,
  areaTitle,
  diagnosticWarnings,
} from "@/lib/diagnostic-rules";
import {
  diagnosticParagraphs,
  packDiagnosticBlocks,
  diagnosticImageSlices,
} from "@/lib/diagnostic-layout";
import { editorialFonts } from "@/lib/report-editorial";
import { EditorialPage } from "@/app/report-v2/components";
import "./diagnostics.css";
type Block = {
  key: string;
  label: string;
  group?: string;
  keepNext?: boolean;
  breakBefore?: boolean;
  node: ReactNode;
};
type Dimensions = Record<string, { width: number; height: number }>;
const severityText = { A: "Alta", M: "Média", B: "Baixa" };
const value = (v: string, u: string) =>
  v ? `${v} ${u}`.trim() : "Não informada";
function blocksFor(d: Diagnostic, sizes: Dimensions): Block[] {
  const blocks: Block[] = [];
  const add = (
    key: string,
    label: string,
    node: ReactNode,
    options: Partial<Block> = {},
  ) => blocks.push({ key, label, node, ...options });
  const summary = executiveSummary(d);
  add(
    "cover-head",
    "Visão executiva",
    <div className="dv-cover">
      <div className="dv-kicker">Diagnóstico de entrada · Gestão de lojas</div>
      <h1>{d.store || "Nome da loja"}</h1>
      <div className="dv-meta">
        <div>
          <small>Responsável</small>
          {d.manager || "Não informado"}
        </div>
        <div>
          <small>Período analisado</small>
          {d.period || "Não informado"}
        </div>
        <div>
          <small>Data da análise</small>
          {d.date.split("-").reverse().join("/")}
        </div>
        <div>
          <small>Conferência</small>
          {d.reviewed
            ? "Conferido pela gestão"
            : "Rascunho — conferência pendente"}
        </div>
      </div>
    </div>,
    { group: "cover", keepNext: true },
  );
  add(
    "cover-score",
    "Visão executiva",
    <div className="dv-cover">
      <h2>Resumo executivo</h2>
      <p>
        {summary.assessed} de {summary.total} áreas avaliadas, com{" "}
        {summary.points.length} pontos identificados. As prioridades abaixo
        orientam o início da gestão; os encaminhamentos detalhados acompanham as
        evidências de cada área.
      </p>
      <div className="dv-score">
        {(["critical", "attention", "good", "pending"] as const).map(
          (status) => (
            <div className={"diag-state-" + status} key={status}>
              <strong>{summary.counts[status]}</strong>
              <span>{diagnosticStatus[status]}</span>
            </div>
          ),
        )}
      </div>
      <div className="dv-area-score">
        {d.sections.map((s) => (
          <div key={s.id}>
            <span>{areaTitle(s.id)}</span>
            <b className={"diag-state-" + s.status}>
              {diagnosticStatus[s.status]}
            </b>
          </div>
        ))}
      </div>
    </div>,
    { group: "cover" },
  );
  add(
    "cover-priorities-head",
    "Prioridades de entrada",
    <h2>Prioridades de entrada</h2>,
    { group: "cover", keepNext: true },
  );
  summary.priorities.forEach(({ areaId, point, evidence }, i) =>
    add(
      "cover-priority-" + i,
      "Prioridades de entrada",
      <div className="dv-priorities">
        <div>
          <b className={"dv-priority sev-" + point.severity}>{i + 1}</b>
          <div>
            <strong>{point.title}</strong>
            <p>
              {areaTitle(areaId)} ·{" "}
              {evidence.length > 140 ? evidence.slice(0, 140) + "…" : evidence}
            </p>
          </div>
        </div>
      </div>,
      { group: "cover" },
    ),
  );
  if (!summary.priorities.length)
    add(
      "cover-no-priorities",
      "Prioridades de entrada",
      <p>
        Nenhum problema marcado. Manter o acompanhamento das áreas conferidas e
        concluir as pendentes.
      </p>,
      { group: "cover" },
    );
  add(
    "cover-method",
    "Visão executiva",
    <p className="dv-method">
      Faixas e metas são referências editáveis da gestão, não limites oficiais
      do iFood. Campos sem evidência ou valor permanecem identificados como não
      informados.
    </p>,
    { group: "cover" },
  );
  if (d.summary)
    diagnosticParagraphs(d.summary).forEach((part, i) =>
      add(
        "legacy-summary" + i,
        "Registro anterior",
        <div className="dv-note">
          <h3>
            Contexto preservado do diagnóstico anterior{" "}
            {i > 0 && "(continuação)"}
          </h3>
          <p>{part}</p>
        </div>,
      ),
    );
  const imagesFor = (s: Diagnostic["sections"][number], group: string) =>
    s.images.forEach((image, i) => {
      const dimensions = sizes[image.url] || { width: 690, height: 400 };
      const slices = diagnosticImageSlices(dimensions.width, dimensions.height);
      slices.forEach((slice, j) =>
        add(
          `${group}-image-${i}-${j}`,
          areaTitle(s.id),
          <figure className="dv-image">
            <div className="dv-image-window" style={{ height: slice.height }}>
              <img
                src={image.url}
                alt={`Print ${i + 1} de ${areaTitle(s.id)}`}
                style={{
                  height: slice.total,
                  transform: `translateY(-${slice.top}px)`,
                }}
              />
            </div>
            <figcaption>
              Print {i + 1} · {areaTitle(s.id)}
              {slices.length > 1
                ? ` · parte ${j + 1}/${slices.length}`
                : ""} · {image.pointIds.length} ponto(s) vinculado(s)
              {image.caption ? ` · ${image.caption}` : ""}
            </figcaption>
          </figure>,
          { group },
        ),
      );
    });
  d.sections
    .filter((s) => s.status !== "good" && (s.points.length || s.images.length))
    .forEach((s) => {
      const title = areaTitle(s.id),
        group = "area-" + s.id;
      add(
        group + "-head",
        title,
        <div className="dv-area-head">
          <div>
            <small>Análise da área</small>
            <h2>{title}</h2>
          </div>
          <span className={"diag-state diag-state-" + s.status}>
            {diagnosticStatus[s.status]}
          </span>
        </div>,
        { group, keepNext: true, breakBefore: blocks.length === 1 },
      );
      imagesFor(s, group);
      s.points.forEach((p, i) => {
        const linked = s.images
          .map((img, j) => (img.pointIds.includes(p.id) ? j + 1 : null))
          .filter(Boolean);
        const evidence =
          p.evidence ||
          (p.observed
            ? `Valor observado: ${value(p.observed, p.unit)}.`
            : "Ponto marcado pela gestão; valor não informado.");
        const action =
          d.actions.find((a) => a.areaId === s.id && a.pointId === p.id)
            ?.description ||
          p.action ||
          "Encaminhamento pendente de definição.";
        const pieces = [
          diagnosticParagraphs(evidence),
          diagnosticParagraphs(action),
        ];
        for (
          let part = 0;
          part < Math.max(...pieces.map((v) => v.length), 1);
          part++
        )
          add(
            group + "-point-" + i + "-" + part,
            title,
            <div className="dv-point">
              <div className="dv-point-title">
                <b>
                  {i + 1}. {p.title}
                  {part > 0 ? " (continuação)" : ""}
                </b>
                <span className={"diag-severity sev-" + p.severity}>
                  {severityText[p.severity]}
                </span>
              </div>
              <div className="dv-point-columns">
                <div>
                  <small>Evidência</small>
                  <p>{pieces[0][part] || "—"}</p>
                  {part === 0 && (
                    <span className="dv-reference">
                      {linked.length
                        ? "Ver print(s) " + linked.join(", ")
                        : "Sem print vinculado"}
                    </span>
                  )}
                </div>
                <div>
                  <small>Encaminhamento</small>
                  <p>{pieces[1][part] || "—"}</p>
                </div>
                <div>
                  <small>Como acompanhar</small>
                  {part === 0 ? (
                    <>
                      <p>{p.kpi || "KPI a definir"}</p>
                      <dl>
                        <dt>Linha de base</dt>
                        <dd>{value(p.baseline || p.observed, p.unit)}</dd>
                        <dt>Meta para revisão</dt>
                        <dd>
                          {p.target
                            ? value(p.target, p.unit)
                            : "A definir pela gestão"}
                        </dd>
                      </dl>
                    </>
                  ) : (
                    <p>Referência na primeira parte deste ponto.</p>
                  )}
                </div>
              </div>
            </div>,
            { group },
          );
      });
      if (!s.points.length)
        add(
          group + "-pending",
          title,
          <p className="dv-note">
            Print anexado, mas a área ainda não foi avaliada. Conferir os dados
            antes de definir o encaminhamento.
          </p>,
          { group },
        );
    });
  const good = d.sections.filter((s) => s.status === "good");
  if (good.length) {
    add(
      "good",
      "Áreas adequadas",
      <div className="dv-good">
        <h2>Áreas adequadas</h2>
        <p>
          A gestão conferiu estas áreas e não marcou problemas. Manter o
          acompanhamento e revisar se houver mudança no desempenho.
        </p>
        {good.map((s) => (
          <div className="dv-good-row" key={s.id}>
            <strong>{areaTitle(s.id)}</strong>
            <span>
              ✓ Adequado
              {s.images.length
                ? ` · ${s.images.length} print(s) no anexo de evidências`
                : " · conferência da gestão"}
            </span>
          </div>
        ))}
      </div>,
      { group: "good" },
    );
  }
  // Adequate-area screenshots remain available at full width, outside the single summary block.
  good
    .filter((s) => s.images.length)
    .forEach((s) => {
      const group = "annex-" + s.id;
      add(
        group + "-head",
        "Evidências de áreas adequadas",
        <div className="dv-area-head">
          <div>
            <small>Anexo · Área adequada</small>
            <h2>{areaTitle(s.id)}</h2>
          </div>
          <span className="diag-state diag-state-good">✓ Adequado</span>
        </div>,
        { group, keepNext: true },
      );
      imagesFor(s, group);
    });
  if (d.actions.length) {
    add(
      "plan-head",
      "Plano de execução",
      <div className="dv-area-head">
        <div>
          <small>Próximos passos</small>
          <h2>Plano de execução</h2>
          <p>
            Prazos contados a partir da análise, salvo data específica
            registrada.
          </p>
        </div>
      </div>,
      { keepNext: true },
    );
    const columns = ([7, 30, 60] as const).map((days) =>
      d.actions
        .filter((a) => a.days === days)
        .flatMap((a) => {
          const parts = diagnosticParagraphs(
            a.description || "Ação pendente de definição.",
          );
          return parts.map((part, i) => ({ a, part, continuation: i > 0 }));
        }),
    );
    for (let row = 0; row < Math.max(...columns.map((c) => c.length)); row++)
      add(
        "plan-row-" + row,
        "Plano de execução",
        <div className="dv-plan-columns">
          {columns.map((col, i) => {
            const item = col[row];
            return (
              <div className="dv-plan-cell" key={i}>
                <small>{[7, 30, 60][i]} dias</small>
                {item ? (
                  <>
                    <h3>
                      {item.a.title}
                      {item.continuation ? " (continuação)" : ""}
                    </h3>
                    <span className="dv-reference">
                      {areaTitle(item.a.areaId)}
                    </span>
                    <p>{item.part}</p>
                    <div className="dv-plan-meta">
                      Responsável: {item.a.owner || d.manager || "A definir"}
                      <br />
                      Prazo: {item.a.deadline || `${item.a.days} dias`}
                    </div>
                  </>
                ) : (
                  <p className="dv-reference">
                    {row === 0 ? "Sem ações neste prazo." : "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>,
      );
  }
  const warnings = diagnosticWarnings(d);
  warnings.forEach((warning, i) =>
    add(
      "warning" + i,
      "Conferência do plano",
      <p className="dv-note dv-warning">Atenção: {warning}</p>,
    ),
  );
  const review = new Date(d.date + "T12:00:00Z");
  review.setUTCDate(review.getUTCDate() + 30);
  add(
    "closing-head",
    "Acompanhamento",
    <div className="dv-area-head">
      <div>
        <small>Fechamento</small>
        <h2>Acompanhamento e revisão em 30 dias</h2>
        <p>
          Revisão prevista:{" "}
          {Number.isNaN(review.getTime())
            ? "A definir"
            : review.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
          . Registrar as alterações, comparar os KPIs com a linha de base e
          reavaliar as prioridades.
        </p>
      </div>
    </div>,
    { keepNext: summary.points.length > 0 },
  );
  summary.points.forEach(({ areaId, point }, i) =>
    add(
      "closing" + i,
      "Acompanhamento",
      <div className="dv-kpi-row">
        <div>
          <strong>{point.kpi || "KPI a definir"}</strong>
          <small>
            {areaTitle(areaId)} · {point.title}
          </small>
        </div>
        <div>
          <small>Linha de base</small>
          {value(point.baseline || point.observed, point.unit)}
        </div>
        <div>
          <small>Meta</small>
          {point.target ? value(point.target, point.unit) : "A definir"}
        </div>
      </div>,
    ),
  );
  return blocks;
}
export default function DiagnosticDocument({ d }: { d: Diagnostic }) {
  const [imageState, setImages] = useState<{
    key: string;
    sizes: Dimensions;
    error?: string;
  }>({ key: "", sizes: {} });
  const imageKey = JSON.stringify(
    d.sections.flatMap((s) => s.images.map((i) => i.url)),
  );
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const sizes: Dimensions = {};
        await Promise.all(
          (JSON.parse(imageKey) as string[]).map(async (url) => {
            const image = new Image();
            image.src = url;
            await image.decode();
            sizes[url] = {
              width: image.naturalWidth,
              height: image.naturalHeight,
            };
          }),
        );
        if (!cancelled) setImages({ key: imageKey, sizes });
      } catch {
        if (!cancelled)
          setImages({
            key: imageKey,
            sizes: {},
            error:
              "Um print não pôde ser carregado. Reabra o diagnóstico ou anexe a imagem novamente.",
          });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [imageKey]);
  const blocks = useMemo(
    () => blocksFor(d, imageState.sizes),
    [d, imageState.sizes],
  );
  const measure = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    blocks: Block[];
    pages: number[][];
    error?: string;
  } | null>(null);
  const ready = layout?.blocks === blocks && imageState.key === imageKey;
  const shared = {
    store: d.store || "Nome da loja",
    period: d.date.split("-").reverse().join("/"),
    source: "Diagnóstico de entrada · Confidencial",
  };
  useEffect(() => {
    if (imageState.key !== imageKey) return;
    let cancelled = false;
    async function paginate() {
      try {
        if (imageState.error) throw Error(imageState.error);
        await Promise.all(
          editorialFonts.map((font) =>
            document.fonts.load(font, "ÁÉÍÓÚÃÕÇ 0123456789"),
          ),
        );
        await document.fonts.ready;
        const host = measure.current!;
        await Promise.all(
          Array.from(host.querySelectorAll("img")).map((img) => img.decode()),
        );
        if (cancelled) return;
        const footer = host.querySelector<HTMLElement>(".rv2-footer")!,
          flow = host.querySelector<HTMLElement>(".diag-flow")!;
        const capacity =
          Math.floor(
            footer.getBoundingClientRect().top -
              24 -
              flow.getBoundingClientRect().top,
          ) - 2;
        const measured = Array.from(
          host.querySelectorAll<HTMLElement>("[data-diag-block]"),
        ).map((el, i) => ({
          ...blocks[i],
          height: Math.ceil(el.getBoundingClientRect().height),
        }));
        setLayout({ blocks, pages: packDiagnosticBlocks(measured, capacity) });
      } catch (e) {
        if (!cancelled)
          setLayout({ blocks, pages: [], error: (e as Error).message });
      }
    }
    void paginate();
    return () => {
      cancelled = true;
    };
  }, [blocks, imageKey, imageState]);
  const renderBlock = (i: number) => (
    <div
      className="diag-flow-block"
      data-diag-block={blocks[i].key}
      key={blocks[i].key}
    >
      {blocks[i].node}
    </div>
  );
  return (
    <>
      {!ready && <p role="status">Organizando as páginas do diagnóstico…</p>}
      {ready && layout?.error && <p role="alert">{layout.error}</p>}
      <div
        className="report-document diag-compact-document diag-v2"
        id="diagnostic-document"
        data-diagnostic-layout={
          ready ? (layout?.error ? "error" : "ready") : "pending"
        }
        data-layout-error={layout?.error}
      >
        {ready &&
          layout?.pages.map((page, i) => (
            <EditorialPage key={i} {...shared} page={i + 1}>
              <div className="diag-flow-running">
                {blocks[page[0]].label} · {i + 1}/{layout.pages.length}
              </div>
              <div className="diag-sheet diag-flow">
                {page.map(renderBlock)}
              </div>
            </EditorialPage>
          ))}
      </div>
      <div
        ref={measure}
        className="report-document diag-compact-document diag-v2 diag-measure"
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
          <div className="diag-flow-running">Medição</div>
          <div className="diag-sheet diag-flow">
            {blocks.map((_, i) => renderBlock(i))}
          </div>
        </EditorialPage>
      </div>
    </>
  );
}
