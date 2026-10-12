import { Report, values, fields, money, num } from "@/lib/report";
import { editorialHistory, insightRows } from "@/lib/analysis";
import {
  compactMoney,
  decimal,
  finite,
  monthLabel,
} from "@/lib/report-editorial";
import {
  DisplayTitle,
  EditorialPage,
  Eyebrow,
  InsightRows,
  KpiCell,
  NotAvailableRow,
  Rule,
} from "./components";
import { Change } from "./core-pages";
function HistoryBars({
  points,
  current,
  currency = false,
}: {
  points: { period: string; value: number | null }[];
  current: string;
  currency?: boolean;
}) {
  const maximum = Math.max(
      1,
      ...points.filter((x) => finite(x.value)).map((x) => Math.abs(x.value!)),
    ),
    prior = points.filter((x) => x.period < current && finite(x.value)),
    average = prior.length
      ? prior.reduce((s, x) => s + x.value!, 0) / prior.length
      : null;
  return (
    <div className="rv2-chart">
      <div className="rv2-chart-bars">
        {points.map((x) => (
          <div className="rv2-chart-column" key={x.period}>
            <span>
              {x.value === null
                ? "N/D"
                : currency
                  ? compactMoney(x.value)
                  : num(x.value)}
            </span>
            <div className="rv2-chart-track">
              <div
                className={x.period === current ? "rv2-current" : ""}
                style={{
                  height:
                    x.value === null
                      ? "0"
                      : `${(Math.abs(x.value) / maximum) * 100}%`,
                }}
              />
              {x.value === null && <span>—</span>}
            </div>
            <span>{monthLabel(x.period).replace(" de ", " ")}</span>
          </div>
        ))}
        {average !== null &&
          average >= 0 &&
          points.every((x) => x.value === null || x.value >= 0) && (
            <div
              className="rv2-average"
              style={{ bottom: `${42 + (average / maximum) * 118}px` }}
            />
          )}
      </div>
      {average !== null && (
        <div className="rv2-chart-legend">
          Média dos meses anteriores: {currency ? money(average) : num(average)}{" "}
          · âmbar: mês atual
        </div>
      )}
      {points.some((x) => x.value !== null && x.value < 0) && (
        <div className="rv2-chart-legend">
          Altura em valor absoluto; sinais indicados nos rótulos.
        </div>
      )}
    </div>
  );
}
export function SalesPage({
  r,
  reports,
  page,
}: {
  r: Report;
  reports: Report[];
  page: number;
}) {
  const f = values(r, "finance", r.current),
    s = values(r, "sales", r.current),
    timeline = editorialHistory(r, reports),
    history =
      timeline.filter((p) => p.status !== null).length >= 2
        ? timeline
        : [r.previous, r.current].map((period) => ({
            period,
            net: values(r, "finance", period).net ?? null,
            orders: values(r, "sales", period).orders ?? null,
          }));
  return (
    <EditorialPage store={r.store} period={monthLabel(r.current)} page={page}>
      <Eyebrow>Faturamento e pedidos</Eyebrow>
      <DisplayTitle>
        Como a loja
        <br />
        vendeu
      </DisplayTitle>
      <Rule />
      <div className="rv2-kpis rv2-small-kpis">
        <KpiCell
          label="Vendas brutas"
          value={finite(f.gross) ? compactMoney(f.gross) : null}
        />
        <KpiCell
          label="Valor total das vendas"
          value={finite(s.salesValue) ? compactMoney(s.salesValue) : null}
        />
        <KpiCell
          label="Líquido ÷ bruto"
          value={
            finite(f.net) && finite(f.gross) && f.gross > 0
              ? decimal((f.net / f.gross) * 100)
              : null
          }
          suffix="%"
        />
      </div>
      <Eyebrow>Faturamento líquido · evolução mensal</Eyebrow>
      <HistoryBars
        points={history.map((p) => ({ period: p.period, value: p.net }))}
        current={r.current}
        currency
      />
      <div className="rv2-two-columns">
        <div>
          <Eyebrow>Pedidos por mês</Eyebrow>
          <HistoryBars
            points={history.map((p) => ({ period: p.period, value: p.orders }))}
            current={r.current}
          />
        </div>
        <InsightRows rows={insightRows(r, "sales")} />
      </div>
    </EditorialPage>
  );
}
export function QualityPage({ r, page }: { r: Report; page: number }) {
  const q = r.evidence.find((e) => e.category === "quality")?.values || {},
    valid = fields.quality.flatMap(([key, label]) =>
      finite(q[key]) && finite(r.targets[key])
        ? [
            {
              key,
              label,
              value: q[key]!,
              target: r.targets[key],
              good:
                key === "rating"
                  ? q[key]! >= r.targets[key]
                  : q[key]! <= r.targets[key],
              margin:
                (key === "rating"
                  ? q[key]! - r.targets[key]
                  : r.targets[key] - q[key]!) /
                Math.max(Math.abs(r.targets[key]), 1),
            },
          ]
        : [],
    ),
    ranked = [...valid].sort((a, b) => b.margin - a.margin),
    best = ranked.find((v) => v.good),
    worst = [...ranked].reverse().find((v) => !v.good);
  return (
    <EditorialPage store={r.store} period={monthLabel(r.current)} page={page}>
      <Eyebrow>
        Qualidade operacional · {r.qualityPeriod || "período não informado"}
      </Eyebrow>
      <DisplayTitle>
        Experiência
        <br />
        do cliente
      </DisplayTitle>
      <Rule />
      <div className="rv2-kpis">
        {fields.quality.map(([key, label]) => (
          <KpiCell
            key={key}
            label={label}
            tone={
              !valid.some((v) => v.key === key)
                ? "neutral"
                : valid.find((v) => v.key === key)?.good
                  ? "positive"
                  : "negative"
            }
            value={finite(q[key]) ? decimal(q[key]!) : null}
            suffix={key === "rating" ? "" : "%"}
            detail={
              finite(r.targets[key]) ? (
                <span
                  className={
                    !valid.some((v) => v.key === key)
                      ? "rv2-neutral"
                      : valid.find((v) => v.key === key)?.good
                        ? "rv2-positive"
                        : "rv2-negative"
                  }
                >
                  Meta {key === "rating" ? "≥" : "≤"} {decimal(r.targets[key])}
                  {key === "rating" ? "" : "%"}
                </span>
              ) : (
                <span className="rv2-label">Meta não informada</span>
              )
            }
          />
        ))}
      </div>
      <div className="rv2-quality-bars">
        {valid.map((v) => (
          <div key={v.key}>
            <div className="rv2-label">
              {v.label} · {v.good ? "DENTRO DA META" : "PRECISA DE ATENÇÃO"}
            </div>
            <div className="rv2-quality-track">
              <div
                style={{
                  width: `${(v.value / Math.max(v.value, v.target, 1)) * 100}%`,
                }}
                className={v.good ? "rv2-good-bar" : "rv2-bad-bar"}
              />
              <span
                style={{
                  left: `${(v.target / Math.max(v.value, v.target, 1)) * 100}%`,
                }}
              />
            </div>
            <small>
              Resultado {decimal(v.value)} · marca: meta {decimal(v.target)}
            </small>
          </div>
        ))}
      </div>
      <InsightRows rows={insightRows(r, "quality")} />
      <div className="rv2-two-columns">
        {best && (
          <div>
            <Eyebrow>Ponto forte</Eyebrow>
            <strong className="rv2-positive">{best.label}</strong>
            <p>
              Resultado {decimal(best.value)}; meta {decimal(best.target)}.
            </p>
          </div>
        )}
        {worst && (
          <div>
            <Eyebrow>Ponto de atenção</Eyebrow>
            <strong className="rv2-negative">{worst.label}</strong>
            <p>
              Resultado {decimal(worst.value)}; meta {decimal(worst.target)}.
            </p>
          </div>
        )}
      </div>
    </EditorialPage>
  );
}
export function CostsPage({ r, page }: { r: Report; page: number }) {
  const f = values(r, "finance", r.current),
    a = values(r, "finance", r.previous),
    all = fields.finance.every(([key]) => finite(f[key]));
  const rows = fields.finance.map(([key, label], index) => {
    const running = fields.finance
      .slice(0, index)
      .reduce((sum, [k]) => sum + (f[k] ?? 0), 0);
    const value = f[key];
    if (!finite(value)) return { key, label, value: null, start: 0, end: 0 };
    const start = key === "gross" || key === "net" ? 0 : running,
      end = key === "gross" || key === "net" ? value : running + value;
    return { key, label, value, start, end };
  });
  const low = Math.min(0, ...rows.flatMap((x) => [x.start, x.end])),
    high = Math.max(1, ...rows.flatMap((x) => [x.start, x.end])),
    span = high - low;
  return (
    <EditorialPage
      store={r.store}
      period={monthLabel(r.current)}
      page={page}
      theme="dark"
    >
      <Eyebrow>Custos e promoções</Eyebrow>
      <DisplayTitle>
        O que pesou
        <br />
        no resultado
      </DisplayTitle>
      <Rule />
      <div className="rv2-cost-kpis">
        {[
          ["promotions", "Serviços e promoções"],
          ["fees", "Taxas e comissões"],
        ].map(([key, label]) => (
          <div key={key}>
            <Eyebrow>{label}</Eyebrow>
            <div className="rv2-cost-number">{compactMoney(f[key])}</div>
            {finite(f[key]) && finite(f.gross) && f.gross > 0 && (
              <p>
                {decimal((Math.abs(f[key]!) / f.gross) * 100)}% das vendas
                brutas
              </p>
            )}
            <Change
              previous={finite(a[key]) ? Math.abs(a[key]!) : null}
              current={finite(f[key]) ? Math.abs(f[key]!) : null}
              inverse
            />
          </div>
        ))}
      </div>
      {all ? (
        <div className="rv2-waterfall">
          {rows.map((row) => (
            <div key={row.key}>
              <span className="rv2-label">{row.label}</span>
              <div className="rv2-waterfall-track">
                <div
                  style={{
                    left: `${((Math.min(row.start, row.end) - low) / span) * 100}%`,
                    width: `${(Math.abs(row.end - row.start) / span) * 100}%`,
                  }}
                  className={row.key === "net" ? "rv2-current" : ""}
                />
              </div>
              <strong>{money(row.value)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <NotAvailableRow>
          Faltam valores para montar a composição financeira completa.
        </NotAvailableRow>
      )}
      {finite(f.gross) &&
        f.gross > 0 &&
        finite(f.promotions) &&
        f.promotions !== 0 && (
          <div className="rv2-cost-ratio">
            <Eyebrow>Vendas brutas por R$ 1 em serviços e promoções</Eyebrow>
            <strong>{money(f.gross / Math.abs(f.promotions))}</strong>
          </div>
        )}
      <InsightRows rows={insightRows(r, "costs")} />
    </EditorialPage>
  );
}
