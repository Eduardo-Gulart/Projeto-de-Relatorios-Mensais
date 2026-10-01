import { insightRows } from "@/lib/analysis";
/* eslint-disable @next/next/no-img-element -- HTML images are shared with PDF capture. */
import { Report, values, fields, money, num } from "@/lib/report";
import { defaultBranding } from "@/lib/branding";
import {
  compactMoney,
  decimal,
  finite,
  followingMonth,
  funnelTransitions,
  monthLabel,
  percentChange,
  safeRate,
} from "@/lib/report-editorial";
import {
  BrandMarks,
  DarkCallout,
  Delta,
  DisplayTitle,
  EditorialPage,
  Eyebrow,
  InsightRows,
  KpiCell,
  Rule,
} from "./components";
export function Change({
  previous,
  current,
  points = false,
  currency = false,
  inverse = false,
}: {
  previous?: number | null;
  current?: number | null;
  points?: boolean;
  currency?: boolean;
  inverse?: boolean;
}) {
  const d = points
    ? finite(previous) && finite(current)
      ? current - previous
      : null
    : percentChange(previous, current);
  return (
    <Delta value={d} inverse={inverse}>
      {d === null
        ? "Comparação não disponível"
        : `${decimal(Math.abs(d))}${points ? " p.p." : "%"}${currency && finite(current) && finite(previous) ? ` · ${current - previous >= 0 ? "+" : ""}${money(current - previous)}` : ""} vs. mês anterior`}
    </Delta>
  );
}
export function CoverPage({ r }: { r: Report }) {
  return (
    <section
      className="report-page rv2-page rv2-cover"
      data-report-layout="editorial"
    >
      <div className="rv2-content">
        <img
          className="rv2-cover-image"
          src={defaultBranding.header}
          alt="Will e iFood"
        />
        <div className="rv2-cover-body">
          <Eyebrow>{defaultBranding.coverEyebrow}</Eyebrow>
          <DisplayTitle>
            Relatório de
            <br />
            desempenho
            <br />
            <span className="rv2-highlight">comercial</span>
          </DisplayTitle>
          <div className="rv2-cover-meta">
            {[
              ["Unidade", r.store, r.client],
              [
                "Período analisado",
                monthLabel(r.current),
                `comparado a ${monthLabel(r.previous)}`,
              ],
              ["Responsável pela gestão", r.manager, ""],
              [
                "Início da gestão",
                r.started && /^\d{4}-\d{2}-\d{2}$/.test(r.started)
                  ? r.started.split("-").reverse().join("/")
                  : r.started,
                "",
              ],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <span className="rv2-label">{label}</span>
                <strong>{value || "Não informado"}</strong>
                {sub && <p>{sub}</p>}
              </div>
            ))}
          </div>
          <p className="rv2-label">{defaultBranding.confidentiality}</p>
        </div>
      </div>
    </section>
  );
}
export function SummaryPage({
  r,
  page = 2,
  summary,
}: {
  r: Report;
  page?: number;
  summary?: string;
}) {
  const f = values(r, "finance", r.current),
    a = values(r, "finance", r.previous),
    s = values(r, "sales", r.current),
    b = values(r, "sales", r.previous),
    u = values(r, "funnel", r.current),
    v = values(r, "funnel", r.previous),
    q = r.evidence.find((e) => e.category === "quality")?.values || {};
  const conv = safeRate(u.completed, u.visits),
    old = safeRate(v.completed, v.visits);
  const cash = compactMoney(f.net).replace(/^R\$ /, "").split(" ");
  return (
    <EditorialPage store={r.store} period={monthLabel(r.current)} page={page}>
      <Eyebrow>Resumo executivo</Eyebrow>
      <DisplayTitle>
        O mês em
        <br />
        60 segundos
      </DisplayTitle>
      <Rule />
      <div className="rv2-kpis">
        <KpiCell
          label="Faturamento líquido"
          value={finite(f.net) ? cash[0] : null}
          prefix="R$ "
          suffix={cash[1] ? " " + cash[1] : undefined}
          detail={<Change previous={a.net} current={f.net} currency />}
        />
        <KpiCell
          label="Pedidos"
          value={finite(s.orders) ? num(s.orders) : null}
          detail={<Change previous={b.orders} current={s.orders} />}
        />
        <KpiCell
          label="Ticket médio"
          value={finite(s.ticket) ? decimal(s.ticket, 2) : null}
          prefix="R$ "
          detail={<Change previous={b.ticket} current={s.ticket} currency />}
        />
        <KpiCell
          label="Conversão do cardápio"
          value={conv === null ? null : decimal(conv)}
          suffix="%"
          detail={<Change previous={old} current={conv} points />}
        />
        <KpiCell
          label="Novos clientes"
          value={finite(s.newCustomers) ? num(s.newCustomers) : null}
          detail={<Change previous={b.newCustomers} current={s.newCustomers} />}
        />
        <KpiCell
          label="Avaliação"
          value={finite(q.rating) ? decimal(q.rating) : null}
          detail={
            finite(r.targets.rating) ? (
              <span className="rv2-label">
                Meta ≥ {decimal(r.targets.rating)}
              </span>
            ) : undefined
          }
        />
      </div>
      {summary?.trim() && (
        <DarkCallout label="Diagnóstico do mês">{summary}</DarkCallout>
      )}
    </EditorialPage>
  );
}
export function FunnelPage({ r, page }: { r: Report; page: number }) {
  const f = values(r, "funnel", r.current),
    a = values(r, "funnel", r.previous),
    transitions = funnelTransitions(f, a),
    rates = transitions.filter((t) => t.rate !== null),
    lowest = rates.length ? Math.min(...rates.map((t) => t.rate!)) : null,
    c = safeRate(f.completed, f.visits),
    p = safeRate(a.completed, a.visits);
  return (
    <EditorialPage
      store={r.store}
      period={monthLabel(r.current)}
      page={page}
      theme="dark"
    >
      <Eyebrow>Conversão do cardápio</Eyebrow>
      <DisplayTitle>
        Do acesso
        <br />
        ao pedido
      </DisplayTitle>
      <p>
        Cada barra mostra o volume de uma etapa em relação às visitas. À
        direita, o valor do período anterior.
      </p>
      <div className="rv2-funnel">
        {fields.funnel.map(([key, label], i) => {
          const width = safeRate(f[key], f.visits),
            transition = transitions[i],
            target = r.targets[key];
          return (
            <div key={key}>
              <div className="rv2-funnel-row">
                <span className="rv2-label">{label}</span>
                <div className="rv2-funnel-track">
                  <div
                    className="rv2-funnel-bar"
                    style={{ width: `${width ?? 0}%` }}
                  />
                  <strong>{finite(f[key]) ? num(f[key]) : "—"}</strong>
                  {finite(target) &&
                    target >= 0 &&
                    target <= 100 &&
                    key !== "visits" && (
                      <span
                        className="rv2-target-mark"
                        style={{ left: `${target}%` }}
                        title={`Meta: ${decimal(target)}% das visitas`}
                      />
                    )}
                </div>
                <span className="rv2-funnel-old">
                  {monthLabel(r.previous)}
                  <br />
                  {num(a[key])}
                </span>
              </div>
              {transition && (
                <div
                  className={
                    "rv2-transition " +
                    (transition.rate !== null && transition.rate === lowest
                      ? "rv2-highlight"
                      : "")
                  }
                >
                  {transition.rate === null
                    ? "Taxa não disponível"
                    : `${decimal(transition.rate)}% seguiram`}
                  {transition.delta !== null
                    ? ` · ${transition.delta >= 0 ? "+" : ""}${decimal(transition.delta)} p.p.`
                    : ""}
                  {transition.rate !== null && transition.rate === lowest
                    ? " · maior perda"
                    : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rv2-funnel-bottom">
        <div>
          <Eyebrow>Conversão total</Eyebrow>
          <div className="rv2-hero-number">
            {c === null ? "—" : decimal(c) + "%"}
          </div>
          <Change previous={p} current={c} points />
        </div>
        <InsightRows
          rows={insightRows(r, "funnel").filter(
            (row) => row.label !== "IMPACTO",
          )}
        />
      </div>
    </EditorialPage>
  );
}
export function ClosingPage({ r }: { r: Report }) {
  return (
    <section
      className="report-page rv2-page rv2-dark rv2-closing"
      data-report-layout="editorial"
    >
      <div className="rv2-content">
        <Eyebrow>
          {defaultBranding.confidentiality} · {r.store || "Não informado"}
        </Eyebrow>
        <DisplayTitle>
          {defaultBranding.closing.text}
          <br />
          <span className="rv2-highlight">
            {defaultBranding.closing.highlight}
          </span>
        </DisplayTitle>
        <p>
          Acompanhar os resultados é parte da evolução da operação. Use este
          relatório para priorizar ações e conferir seus efeitos no próximo
          período.
        </p>
        <div className="rv2-closing-bottom">
          <BrandMarks />
          <div>
            Próximo relatório: {monthLabel(followingMonth(r.current))}
            <br />
            Dados: {defaultBranding.source}
          </div>
        </div>
      </div>
    </section>
  );
}
