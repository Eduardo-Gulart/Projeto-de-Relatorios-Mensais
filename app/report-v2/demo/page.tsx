"use client";
import { useState } from "react";
import { downloadReport } from "@/lib/download";
import {
  DarkCallout,
  Delta,
  DisplayTitle,
  EditorialPage,
  Eyebrow,
  KpiCell,
  Rule,
} from "../components";

export default function EditorialDemo() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function exportDemo() {
    setBusy(true);
    setError("");
    try {
      const result = await downloadReport("Relata - demonstração editorial");
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(result.url), 60000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar o PDF.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-ui rv2-demo">
      <div className="rv2-demo-toolbar">
        <h1>Prévia editorial · fase A</h1>
        <p>
          Demonstração com dados inteiramente fictícios. O relatório atual
          continua disponível na tela principal.
        </p>
        <button disabled={busy} onClick={exportDemo}>
          {busy ? "Gerando…" : "Baixar demonstração em PDF"}
        </button>{" "}
        {/* Full navigation isolates the demonstration from the editing session. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/">Voltar ao sistema</a>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="rv2-demo-scroll">
        <div className="report-document">
          <EditorialPage
            store="Loja demonstração"
            period="JANEIRO 2026"
            page={2}
            source="DADOS FICTÍCIOS · DEMONSTRAÇÃO VISUAL"
          >
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
                value="32,8"
                prefix="R$ "
                suffix=" mil"
                detail={
                  <Delta value={25}>25,0% · +R$ 6.560 vs. anterior</Delta>
                }
              />
              <KpiCell
                label="Pedidos"
                value="820"
                detail={<Delta value={20}>20,0% vs. mês anterior</Delta>}
              />
              <KpiCell
                label="Ticket médio"
                value="40,00"
                prefix="R$ "
                detail={<Delta value={4.2}>4,2% vs. mês anterior</Delta>}
              />
              <KpiCell
                label="Conversão do cardápio"
                value="20,0"
                suffix="%"
                detail={<Delta value={2}>2,0 p.p. vs. mês anterior</Delta>}
              />
              <KpiCell
                label="Novos clientes"
                value="240"
                detail={<Delta value={-4}>4,0% vs. mês anterior</Delta>}
              />
              <KpiCell
                label="Avaliação"
                value="4,8"
                detail={<span className="rv2-label">Meta ≥ 4,7</span>}
              />
            </div>
            <DarkCallout label="Diagnóstico do mês">
              <p>
                Neste exemplo fictício, o faturamento líquido chegou a{" "}
                <strong>R$ 32,8 mil</strong>. O crescimento dos pedidos
                acompanha a melhora da conversão do cardápio. A avaliação atende
                à meta; a aquisição de novos clientes merece acompanhamento.
              </p>
            </DarkCallout>
          </EditorialPage>
        </div>
      </div>
    </div>
  );
}
