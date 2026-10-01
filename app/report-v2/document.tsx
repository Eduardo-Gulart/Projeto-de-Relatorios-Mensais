/* eslint-disable @next/next/no-img-element -- PDF capture uses original images. */
import { Report, fields, values } from "@/lib/report";
import {
  actionPages,
  opportunityEstimate,
  suggestAttention,
  suggestWins,
  suggestedActions,
} from "@/lib/analysis";
import {
  decimal,
  finite,
  followingMonth,
  monthLabel,
} from "@/lib/report-editorial";
import { CoverPage, SummaryPage, FunnelPage, ClosingPage } from "./core-pages";
import { SalesPage, QualityPage, CostsPage } from "./data-pages";
import {
  DarkCallout,
  DisplayTitle,
  EditorialPage,
  Eyebrow,
  Rule,
} from "./components";
function ReadingPage({ r, page }: { r: Report; page: number }) {
  const wins = suggestWins(r),
    attention = suggestAttention(r),
    op = opportunityEstimate(r);
  return (
    <EditorialPage
      store={r.store}
      period={monthLabel(r.current)}
      page={page}
      source={
        op
          ? `Estimativa: ${op.formula} = ${op.extra} pedidos adicionais. Não é uma previsão.`
          : undefined
      }
    >
      <Eyebrow>Diagnóstico da unidade</Eyebrow>
      <DisplayTitle>
        Nossa leitura
        <br />
        da unidade
      </DisplayTitle>
      <Rule />
      <div className="rv2-two-columns rv2-readings">
        {[
          [wins, "O que funcionou", "positive"],
          [attention, "O que precisa de atenção", "negative"],
        ].map(([items, label, tone]) => (
          <div key={label as string}>
            <h3 className={"rv2-" + tone}>{label as string}</h3>
            {(items as typeof wins).length ? (
              (items as typeof wins).map((x) => (
                <div className={"rv2-reading rv2-" + tone} key={x.title}>
                  <strong>{x.title}</strong>
                  <p>{x.description}</p>
                </div>
              ))
            ) : (
              <p>Sem conclusões suficientes para este bloco.</p>
            )}
          </div>
        ))}
      </div>
      {op && (
        <DarkCallout label="Maior oportunidade">
          <h3>
            Melhorar a passagem de{" "}
            {fields.funnel.find(([k]) => k === op.from)?.[1]} para{" "}
            {fields.funnel.find(([k]) => k === op.to)?.[1]}
          </h3>
          <p>
            Simulação de +{decimal(op.lift)} p.p. na taxa desta etapa, mantendo
            as demais taxas constantes.
          </p>
          <div className="rv2-hero-number">+{op.extra}</div>
          <span className="rv2-label">Pedidos/mês · estimativa</span>
        </DarkCallout>
      )}
    </EditorialPage>
  );
}
export default function EditorialDocument({
  r,
  reports = [],
}: {
  r: Report;
  reports?: Report[];
}) {
  let page = 2;
  const has = (category: Parameters<typeof values>[1]) =>
    r.evidence.some(
      (e) => e.category === category && Object.values(e.values).some(finite),
    );
  const manual = r.nextSteps?.length
      ? r.nextSteps
      : r.actions?.length
        ? r.actions
        : undefined,
    plans = actionPages(manual || suggestedActions(r)),
    sources = r.includeEvidence ? r.evidence : [];
  const evidencePages = Array.from(
    { length: Math.ceil(sources.length / 2) },
    (_, i) => sources.slice(i * 2, i * 2 + 2),
  );
  return (
    <div className="report-preview-scroll">
      <div className="report-document">
        <CoverPage r={r} />
        <SummaryPage r={r} page={page++} summary={r.summary} />
        {(has("finance") || has("sales")) && (
          <SalesPage r={r} reports={reports} page={page++} />
        )}{" "}
        {has("funnel") && <FunnelPage r={r} page={page++} />}{" "}
        {has("quality") && <QualityPage r={r} page={page++} />}{" "}
        {has("finance") && <CostsPage r={r} page={page++} />}
        <ReadingPage r={r} page={page++} />
        {plans.map((items, index) => (
          <EditorialPage
            key={`actions-${index}`}
            store={r.store}
            period={monthLabel(r.current)}
            page={page++}
          >
            <Eyebrow>
              Plano de ação · {monthLabel(followingMonth(r.current))}
            </Eyebrow>
            <DisplayTitle>
              Próximos
              <br />
              30 dias
              {index > 0 && (
                <span className="rv2-continuation"> · continuação</span>
              )}
            </DisplayTitle>
            <Rule />
            <div className="rv2-actions">
              {items.map((item, i) => (
                <div className="rv2-action" key={i}>
                  <span className="rv2-action-number">
                    {String(
                      plans.slice(0, index).reduce((n, a) => n + a.length, 0) +
                        i +
                        1,
                    ).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  {(item.indicator || item.target) && (
                    <aside>
                      <span className="rv2-label">Indicador</span>
                      <strong>{item.indicator}</strong>
                      <p>{item.target}</p>
                    </aside>
                  )}
                </div>
              ))}
            </div>
          </EditorialPage>
        ))}
        {evidencePages.map((items, index) => (
          <EditorialPage
            key={`evidence-${index}`}
            store={r.store}
            period={monthLabel(r.current)}
            page={page++}
          >
            <Eyebrow>Anexo · {index + 1}</Eyebrow>
            <DisplayTitle>
              Fontes
              <br />
              dos dados
            </DisplayTitle>
            <Rule />
            {items.map((e) => (
              <figure key={e.id} className="rv2-evidence">
                <figcaption>
                  {
                    {
                      finance: "Financeiro",
                      sales: "Vendas",
                      funnel: "Funil",
                      quality: "Qualidade",
                    }[e.category]
                  }{" "}
                  ·{" "}
                  {e.category === "quality"
                    ? r.qualityPeriod || "Período não informado"
                    : monthLabel(e.period)}
                </figcaption>
                <img src={e.url} alt={`Fonte: ${e.category}`} />
              </figure>
            ))}
          </EditorialPage>
        ))}
        <ClosingPage r={r} />
      </div>
    </div>
  );
}
