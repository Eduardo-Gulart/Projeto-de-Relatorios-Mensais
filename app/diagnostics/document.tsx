/* eslint-disable @next/next/no-img-element */
import {
  Diagnostic,
  activeSections,
  diagnosticSections,
  diagnosticStatus,
  diagnosticSectionPages,
} from "@/lib/diagnostic";
import { EditorialPage } from "@/app/report-v2/components";
import "./diagnostics.css";
export default function DiagnosticDocument({ d }: { d: Diagnostic }) {
  const sections = activeSections(d);
  let page = 0;
  const shared = {
    store: d.store || "Nome da loja",
    period: d.date.split("-").reverse().join("/"),
    source: "Diagnóstico de entrada · Análise da gestão · Confidencial",
  };
  const actionGroups = Array.from(
    { length: Math.ceil(d.actions.length / 2) },
    (_, i) => d.actions.slice(i * 2, i * 2 + 2),
  );
  return (
    <div className="report-document" id="diagnostic-document">
      <EditorialPage {...shared} page={++page}>
        <div className="diag-sheet diag-cover">
          <div className="diag-kicker">
            ESTRATÉGIA & OPERAÇÃO / ENTRADA NA GESTÃO
          </div>
          <h1>
            Diagnóstico
            <br />
            da loja<span>.</span>
          </h1>
          <p className="diag-store">{d.store || "Nome da loja"}</p>
          <div className="diag-cover-rule" />
          <div className="diag-meta">
            <div>
              <small>RESPONSÁVEL PELA ANÁLISE</small>
              <strong>{d.manager || "Não informado"}</strong>
            </div>
            <div>
              <small>PERÍODO ANALISADO</small>
              <strong>{d.period || "Não informado"}</strong>
            </div>
          </div>
          <div className="diag-summary">
            <small>VISÃO EXECUTIVA</small>
            <p>
              Este diagnóstico reúne a avaliação inicial da operação, os pontos
              de atenção identificados e as ações propostas para o início da
              gestão.
            </p>
          </div>
          <div className="diag-counts">
            <div>
              <b>{sections.length}</b>
              <span>áreas incluídas</span>
            </div>
            <div>
              <b>
                {
                  sections.filter(
                    (s) => s.status === "critical" || s.status === "attention",
                  ).length
                }
              </b>
              <span>áreas em atenção</span>
            </div>
            <div>
              <b>{d.actions.length}</b>
              <span>ações propostas</span>
            </div>
          </div>
          <p className="diag-scope">
            {d.reviewed
              ? "Documento conferido pela gestão."
              : "RASCUNHO · Conferência pendente."}{" "}
            Avaliações baseadas nas informações fornecidas. Áreas não avaliadas
            não representam aprovação da operação.
          </p>
        </div>
      </EditorialPage>
      {d.summary && (
        <EditorialPage {...shared} page={++page}>
          <div className="diag-sheet">
            <div className="diag-kicker">VISÃO EXECUTIVA</div>
            <h2>O ponto de partida.</h2>
            <div className="diag-summary">
              <p>{d.summary}</p>
            </div>
            <p className="diag-scope">
              Síntese elaborada pela gestão a partir das informações disponíveis
              no período analisado.
            </p>
          </div>
        </EditorialPage>
      )}
      {sections.flatMap((s, index) =>
        diagnosticSectionPages(s).map((part, partIndex) => (
          <EditorialPage key={s.id + "-" + partIndex} {...shared} page={++page}>
            <div className="diag-sheet diag-section-sheet">
              <div className="diag-kicker">
                DIAGNÓSTICO / {String(index + 1).padStart(2, "0")}
                {partIndex ? " · CONTINUAÇÃO" : ""}
              </div>
              <h2>{diagnosticSections.find((t) => t.id === s.id)!.title}</h2>
              <div className={"diag-state diag-state-" + s.status}>
                {diagnosticStatus[s.status]}
              </div>
              {part.images.length > 0 && (
                <div className="diag-evidence-group">
                  {part.images.map((image, imageIndex) => (
                    <figure className="diag-inline-evidence" key={imageIndex}>
                      <img src={image.url} alt={image.caption || "Print da área analisada"} />
                      {image.caption && <figcaption>{image.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
              {part.checks.length > 0 && (
                <div className="diag-findings">
                  <h3>Problemas identificados</h3>
                  {part.checks.map((text) => (
                    <p key={text}>• {text}</p>
                  ))}
                </div>
              )}
              {part.notes && (
                <div className="diag-notes">
                  <h3>Observações da gestão</h3>
                  <p>{part.notes}</p>
                </div>
              )}
              {part.recommendation && (
                <div className="diag-recommendation">
                  <h3>Ação recomendada</h3>
                  <p>{part.recommendation}</p>
                </div>
              )}
              {s.status === "good" && partIndex === diagnosticSectionPages(s).length - 1 && !part.checks.length && !part.notes && (
                <p>
                  Nenhum problema identificado nesta área durante a conferência.
                </p>
              )}
            </div>
          </EditorialPage>
        )),
      )}
      {actionGroups.map((items, i) => (
        <EditorialPage key={"actions" + i} {...shared} page={++page}>
          <div className="diag-sheet">
            <div className="diag-kicker">
              PLANO INICIAL / {i ? "CONTINUAÇÃO" : "PRIMEIROS PASSOS"}
            </div>
            <h2>
              Da análise
              <br />à ação.
            </h2>
            {items.map((a, j) => (
              <article className="diag-action" key={j}>
                <div className="diag-action-heading">
                  <b>{String(i * 2 + j + 1).padStart(2, "0")}</b>
                  <div>
                    <span
                      className={"diag-priority diag-priority-" + a.priority}
                    >
                      Prioridade{" "}
                      {a.priority === "high"
                        ? "alta"
                        : a.priority === "medium"
                          ? "média"
                          : "baixa"}
                    </span>
                    <h3>{a.title || "Ação proposta"}</h3>
                  </div>
                </div>
                <p>{a.description}</p>
                <div className="diag-action-meta">
                  <span>Responsável: {a.owner || "A definir"}</span>
                  <span>Prazo: {a.deadline || "A definir"}</span>
                </div>
              </article>
            ))}
          </div>
        </EditorialPage>
      ))}
    </div>
  );
}
