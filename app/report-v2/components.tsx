/* eslint-disable @next/next/no-img-element -- Local assets must remain HTML images for html2canvas. */
import type { ReactNode } from "react";
import { defaultBranding } from "@/lib/branding";
import { deltaState } from "@/lib/report-editorial";
import "./editorial.css";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="rv2-eyebrow">{children}</p>;
}
export function DisplayTitle({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: string;
}) {
  return (
    <h2 className="rv2-title">
      {children}
      {highlight && <span className="rv2-highlight"> {highlight}</span>}
    </h2>
  );
}
export function Rule() {
  return <div className="rv2-rule" />;
}
export function Delta({
  value,
  inverse = false,
  children,
}: {
  value?: number | null;
  inverse?: boolean;
  children?: ReactNode;
}) {
  const s = deltaState(value, inverse);
  return (
    <div
      className={`rv2-delta rv2-${s.tone}`}
      aria-label={`${s.label}: ${typeof children === "string" ? children : ""}`}
    >
      {s.symbol} {children || s.label}
    </div>
  );
}
export function KpiCell({
  label,
  value,
  prefix,
  suffix,
  detail,
}: {
  label: string;
  value?: string | null;
  prefix?: string;
  suffix?: string;
  detail?: ReactNode;
}) {
  return (
    <div className="rv2-kpi">
      <div className="rv2-label">{label}</div>
      {value == null ? (
        <div className="rv2-unavailable">NÃO DISPONÍVEL</div>
      ) : (
        <div className="rv2-value">
          <small>{prefix}</small>
          {value}
          <small>{suffix}</small>
        </div>
      )}
      {detail}
    </div>
  );
}
export function InsightRows({
  rows,
}: {
  rows: { label: "DADO" | "LEITURA" | "IMPACTO" | "AÇÃO"; text: string }[];
}) {
  return (
    <dl className="rv2-insights">
      {rows
        .filter((r) => r.text.trim())
        .map((r) => (
          <div key={r.label}>
            <dt className={r.label === "AÇÃO" ? "rv2-highlight" : ""}>
              {r.label}
            </dt>
            <dd>{r.text}</dd>
          </div>
        ))}
    </dl>
  );
}
export function NotAvailableRow({ children }: { children: ReactNode }) {
  return (
    <div className="rv2-missing">
      <span className="rv2-label">NÃO DISPONÍVEL</span>
      <span>{children}</span>
    </div>
  );
}
export function DarkCallout({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <aside className="rv2-callout">
      <div className="rv2-label">{label}</div>
      <div>{children}</div>
    </aside>
  );
}
export function BrandMarks() {
  return (
    <span className="rv2-marks">
      {defaultBranding.marks.map((m) => (
        <img key={m.src} src={m.src} alt={m.alt} width={24} height={24} />
      ))}
    </span>
  );
}
export function EditorialPage({
  children,
  store,
  period,
  page,
  theme = "light",
  source = defaultBranding.source,
}: {
  children: ReactNode;
  store: string;
  period: string;
  page: number;
  theme?: "light" | "dark";
  source?: string;
}) {
  const n = String(page).padStart(2, "0");
  return (
    <section
      className={`report-page rv2-page rv2-${theme}`}
      data-report-layout="editorial"
      data-page-number={n}
    >
      <header className="rv2-head">
        <div>
          <BrandMarks />
          <span>{store}</span>
        </div>
        <span>
          {period} · {n}
        </span>
      </header>
      <main className="rv2-content">{children}</main>
      <footer className="rv2-footer">
        <span>{source}</span>
        <span>{n}</span>
      </footer>
    </section>
  );
}
