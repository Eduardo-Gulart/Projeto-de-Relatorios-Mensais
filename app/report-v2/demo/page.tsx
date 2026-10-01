"use client";
import { useState } from "react";
import { downloadReport } from "@/lib/download";
import { editorialFixture } from "@/lib/editorial-fixtures";
import ReportPreview from "../../report-preview";
export default function EditorialDemo() {
  const [mode, setMode] = useState<"complete" | "missing" | "long">("complete"),
    [classic, setClassic] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { r, reports } = editorialFixture(mode);
  if (classic) r.layout = "classic";
  async function download() {
    setBusy(true);
    setError("");
    try {
      const result = await downloadReport(
        `Relata-${mode}-${classic ? "classic" : "editorial"}`,
      );
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(result.url), 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-ui rv2-demo">
      <div className="rv2-demo-toolbar">
        <h1>Relatório editorial</h1>
        <p>
          Modelos de validação com dados inteiramente fictícios. Não alteram
          seus relatórios salvos.
        </p>
        <div className="backup-actions">
          {(["complete", "missing", "long"] as const).map((v) => (
            <button
              key={v}
              className="secondary"
              aria-pressed={mode === v}
              disabled={busy}
              onClick={() => setMode(v)}
            >
              {
                {
                  complete: "Completo",
                  missing: "Sem histórico e metas",
                  long: "Textos longos e anexo",
                }[v]
              }
            </button>
          ))}
          <button
            className="secondary"
            disabled={busy}
            aria-pressed={classic}
            onClick={() => setClassic(!classic)}
          >
            {classic ? "Usar editorial" : "Testar clássico"}
          </button>
          <button disabled={busy} onClick={download}>
            {busy ? "Gerando…" : "Baixar demonstração em PDF"}
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Voltar ao sistema</a>
        {error && <p role="alert">{error}</p>}
      </div>
      <ReportPreview r={r} reports={reports} />
    </div>
  );
}
