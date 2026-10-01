"use client";
import { Report } from "@/lib/report";
import {
  analysisSections,
  insightLabels,
  suggestSummary,
  suggestClassification,
  insightRows,
  suggestedActions,
} from "@/lib/analysis";
export default function EditorialEditor({
  r,
  onChange,
}: {
  r: Report;
  onChange: (p: Partial<Report>) => void;
}) {
  function suggest() {
    const notes = { ...r.notes };
    for (const section of analysisSections) {
      notes[section] = { ...notes[section] };
      for (const row of insightRows({ ...r, notes: undefined }, section))
        if (!notes[section]?.[row.label]?.trim())
          notes[section]![row.label] = row.text.slice(0, 220);
    }
    onChange({
      summary: r.summary?.trim() ? r.summary : suggestSummary(r),
      classification: r.classification || suggestClassification(r),
      notes,
      nextSteps: r.nextSteps?.length
        ? r.nextSteps
        : r.actions?.length
          ? r.actions
          : suggestedActions(r),
    });
  }
  return (
    <section className="panel">
      <h2>Leitura do relatório</h2>
      <p className="muted">
        Textos opcionais do PDF editorial. As sugestões preenchem somente campos
        vazios.
      </p>
      <button type="button" className="secondary" onClick={suggest}>
        Sugerir textos
      </button>
      <label>
        Diagnóstico do mês
        <textarea
          maxLength={700}
          rows={4}
          value={r.summary || ""}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
        <small>{r.summary?.length || 0}/700</small>
      </label>
      <details>
        <summary>Personalizar leitura por seção</summary>
        {analysisSections.map((section) => (
          <fieldset key={section}>
            <legend>
              {
                {
                  sales: "Vendas",
                  funnel: "Funil",
                  quality: "Qualidade",
                  costs: "Custos",
                }[section]
              }
            </legend>
            {insightLabels.map((label) => (
              <label key={label}>
                {label}
                <textarea
                  rows={2}
                  maxLength={220}
                  value={r.notes?.[section]?.[label] || ""}
                  placeholder="Deixe vazio para usar a leitura automática quando houver dados."
                  onChange={(e) =>
                    onChange({
                      notes: {
                        ...r.notes,
                        [section]: {
                          ...r.notes?.[section],
                          [label]: e.target.value,
                        },
                      },
                    })
                  }
                />
                <small>{r.notes?.[section]?.[label]?.length || 0}/220</small>
              </label>
            ))}
          </fieldset>
        ))}
      </details>
    </section>
  );
}
