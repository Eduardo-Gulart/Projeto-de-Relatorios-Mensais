"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import {
  Diagnostic,
  DiagnosticSection,
  DiagnosticPoint,
  SavedDiagnostic,
  newDiagnostic,
  diagnosticStatus,
  diagnosticReady,
  normalizeDiagnostic,
  toggleDiagnosticProblem,
  newOtherPoint,
  updateSection,
  suggestedDiagnosticActions,
  actionForPoint,
} from "@/lib/diagnostic";
import {
  diagnosticCatalog,
  optionById,
  rangeDefaults,
} from "@/lib/diagnostic-catalog";
import {
  actionsAfterAreaEdit,
  executiveSummary,
  diagnosticWarnings,
  areaTitle,
} from "@/lib/diagnostic-rules";
import DiagnosticDocument from "./document";
import { downloadDiagnostic, printDiagnostic } from "@/lib/diagnostic-download";
import DiagnosticImageEditor from "./image-editor";
import "./diagnostics.css";
export default function DiagnosticPanel() {
  const [d, setD] = useState<Diagnostic>(newDiagnostic),
    [version, setVersion] = useState(""),
    [rows, setRows] = useState<SavedDiagnostic[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false);
  const [imageEdit, setImageEdit] = useState<{
    src: string;
    areaId: string;
    index?: number;
  } | null>(null);
  function closeImageEditor() {
    if (imageEdit?.src.startsWith("blob:")) URL.revokeObjectURL(imageEdit.src);
    setImageEdit(null);
  }
  const summary = executiveSummary(d);
  const warnings = diagnosticWarnings(d);
  function change(p: Partial<Diagnostic>) {
    setD((v) => ({
      ...v,
      ...p,
      actions:
        p.actions ||
        (p.manager !== undefined
          ? v.actions.map((a) => ({ ...a, owner: a.owner || p.manager! }))
          : v.actions),
      reviewed: p.reviewed ?? false,
    }));
    setDirty(true);
  }
  async function load() {
    const response = await fetch("/api/diagnostics", { cache: "no-store" });
    const result = (await response.json()) as SavedDiagnostic[] & {
      error?: string;
    };
    if (!response.ok) throw Error(result.error);
    setRows(
      result.map((item: SavedDiagnostic) => ({
        ...normalizeDiagnostic(item),
        updated: item.updated,
      })),
    );
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function editArea(id: string, patch: Partial<DiagnosticSection>) {
    const before = d.sections.find((s) => s.id === id)!;
    const after = updateSection(before, patch);
    const sections = d.sections.map((s) => (s.id === id ? after : s));
    const actions = actionsAfterAreaEdit(d, before, after);
    change({ sections, actions });
  }
  function editPoint(
    areaId: string,
    id: string,
    patch: Partial<DiagnosticPoint>,
  ) {
    const area = d.sections.find((s) => s.id === areaId)!;
    editArea(areaId, {
      points: area.points.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }
  function toggle(area: DiagnosticSection, id: string, checked: boolean) {
    const next = toggleDiagnosticProblem(area, id, checked);
    editArea(area.id, next);
  }
  async function save(copy = false) {
    setBusy(true);
    try {
      const item = copy ? { ...d, id: crypto.randomUUID() } : d;
      const r = await fetch("/api/diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Diagnostic-Version": copy ? "" : version,
        },
        body: JSON.stringify(item),
      });
      const result = (await r.json()) as {
        error?: string;
        updated: string;
        url: string;
      };
      if (!r.ok) throw Error(result.error);
      setD(item);
      setVersion(result.updated);
      setDirty(false);
      setMessage("Diagnóstico salvo.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(item?: SavedDiagnostic) {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setD(item ? normalizeDiagnostic(item) : newDiagnostic());
    setVersion(item?.updated || "");
    setDirty(false);
    setPreview(false);
    setMessage("");
  }
  async function remove(item: SavedDiagnostic) {
    if (!window.confirm("Excluir o diagnóstico de " + item.store + "?")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/diagnostics?id=" + item.id, {
        method: "DELETE",
        headers: { "X-Diagnostic-Version": item.updated },
      });
      if (!r.ok) throw Error(((await r.json()) as { error?: string }).error);
      if (item.id === d.id) {
        setD(newDiagnostic());
        setVersion("");
        setDirty(false);
      }
      await load();
      setMessage("Diagnóstico excluído.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(
    areaId: string,
    file: File,
    metadata: { width: number; height: number; redacted: boolean },
    index?: number,
  ) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/diagnostic-uploads", {
        method: "POST",
        body: form,
      });
      const result = (await r.json()) as {
        error?: string;
        updated: string;
        url: string;
      };
      if (!r.ok) throw Error(result.error);
      const area = d.sections.find((s) => s.id === areaId)!;
      const image = {
        url: result.url,
        caption: index === undefined ? "" : area.images[index].caption,
        pointIds: area.points.map((p) => p.id),
        ...metadata,
        redacted:
          metadata.redacted ||
          (index !== undefined && area.images[index].redacted),
      };
      editArea(areaId, {
        images:
          index === undefined
            ? [...area.images, image]
            : area.images.map((old, i) => (i === index ? image : old)),
      });
      closeImageEditor();
      setMessage(
        "Print anexado. Salve o diagnóstico para guardar a alteração.",
      );
    } catch (e) {
      setMessage((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function pdf(vector = false) {
    setBusy(true);
    try {
      const root = document.getElementById("diagnostic-document")!;
      if (vector) {
        await printDiagnostic(root);
        setMessage(
          "Na janela de impressão, escolha Salvar como PDF. Desative os cabeçalhos e rodapés do navegador.",
        );
        return;
      }
      const file = await downloadDiagnostic("Diagnostico-" + d.store, root);
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(file.url), 60000);
      setMessage("PDF gerado.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function quickFields(area: DiagnosticSection, point: DiagnosticPoint) {
    const option = optionById.get(point.optionId || "");
    const kind = option?.quickValue;
    const config = kind ? rangeDefaults[kind] : null;
    const ranges = kind ? d.rangePresets[kind] || config!.ranges : [];
    return (
      <div className="diag-quick-fields">
        <label>
          Valor observado {point.unit && `(${point.unit})`}
          <input
            aria-label={"Valor observado: " + point.title}
            type="number"
            step="any"
            value={
              point.observed !== "" &&
              Number.isFinite(Number(point.observed.replace(",", ".")))
                ? point.observed.replace(",", ".")
                : ""
            }
            placeholder="Opcional"
            onChange={(e) =>
              editPoint(area.id, point.id, { observed: e.target.value })
            }
          />
        </label>
        {!config && (
          <label>
            Unidade
            <select
              value={point.unit}
              onChange={(e) =>
                editPoint(area.id, point.id, { unit: e.target.value })
              }
            >
              {["", "%", "R$", "min", "nota", "un.", "vezes"].map((u) => (
                <option key={u} value={u}>
                  {u || "Não se aplica"}
                </option>
              ))}
            </select>
          </label>
        )}
        {ranges.length > 0 && (
          <div
            className="diag-range-buttons"
            aria-label={"Faixas de " + point.title}
          >
            {ranges.map((range) => (
              <button
                type="button"
                className={
                  "secondary " + (point.observed === range ? "selected" : "")
                }
                aria-pressed={point.observed === range}
                key={range}
                onClick={() =>
                  editPoint(area.id, point.id, {
                    observed: point.observed === range ? "" : range,
                  })
                }
              >
                {range}
              </button>
            ))}
          </div>
        )}
        <label>
          Meta para revisão {point.unit && `(${point.unit})`}
          <input
            type="number"
            step="any"
            value={
              point.target !== "" &&
              Number.isFinite(Number(point.target.replace(",", ".")))
                ? point.target.replace(",", ".")
                : ""
            }
            placeholder="A definir"
            onChange={(e) =>
              editPoint(area.id, point.id, { target: e.target.value })
            }
          />
        </label>
        <small>
          KPI: {point.kpi || "A definir"}. Linha de base:{" "}
          {point.baseline || point.observed || "Não informada"}.
        </small>
      </div>
    );
  }
  return (
    <div className="diagnostic-workspace">
      <div className="diag-toolbar">
        <div>
          <h2>Diagnósticos de entrada</h2>
          <p>Marque os pontos, anexe as evidências e gere o diagnóstico.</p>
        </div>
        <button className="secondary" disabled={busy} onClick={() => open()}>
          Novo diagnóstico
        </button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {imageEdit && (
        <DiagnosticImageEditor
          src={imageEdit.src}
          onCancel={closeImageEditor}
          onSave={(file, meta) =>
            upload(imageEdit.areaId, file, meta, imageEdit.index)
          }
        />
      )}
      <div className="diag-work-grid">
        <aside className="panel diag-history">
          <h3>Meus diagnósticos</h3>
          {rows.map((item) => (
            <div
              className={
                "diag-history-item " + (item.id === d.id ? "selected" : "")
              }
              key={item.id}
            >
              <button
                className="secondary"
                disabled={busy}
                onClick={() => open(item)}
              >
                {item.store}
                <small>{item.date.split("-").reverse().join("/")}</small>
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => remove(item)}
              >
                Excluir
              </button>
            </div>
          ))}
          {!rows.length && <p>Nenhum diagnóstico salvo.</p>}
        </aside>
        <div>
          <div className="panel diag-controls">
            <div className="diag-button-row">
              <button
                className={!preview ? "" : "secondary"}
                disabled={busy}
                onClick={() => setPreview(false)}
              >
                Preencher diagnóstico
              </button>
              <button
                className={preview ? "" : "secondary"}
                disabled={busy}
                onClick={() => setPreview(true)}
              >
                Prévia do diagnóstico
              </button>
              <button disabled={busy || !d.store.trim()} onClick={() => save()}>
                Salvar diagnóstico
              </button>
              <button
                className="secondary"
                disabled={busy || !d.store.trim()}
                onClick={() => save(true)}
              >
                Salvar cópia
              </button>
              {preview && (
                <>
                  <button
                    disabled={busy || !diagnosticReady(d)}
                    onClick={() => pdf(true)}
                  >
                    Imprimir / salvar PDF
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || !diagnosticReady(d)}
                    onClick={() => pdf(false)}
                  >
                    Baixar PDF compatível
                  </button>
                </>
              )}
            </div>
            <small>
              {dirty ? "Há alterações não salvas." : "Diagnóstico atualizado."}
            </small>
          </div>
          {preview ? (
            <div className="diag-preview-scroll">
              <DiagnosticDocument d={d} />
            </div>
          ) : (
            <fieldset disabled={busy}>
              {d.migration?.needsReview && (
                <p className="notice">
                  Diagnóstico anterior convertido sem apagar informações.
                  Confira os pontos importados e o plano antes de gerar o novo
                  PDF.
                </p>
              )}
              <section className="panel">
                <h3>Ficha da loja</h3>
                <div className="diag-form-grid">
                  <label>
                    Nome da loja *
                    <input
                      value={d.store}
                      maxLength={100}
                      onChange={(e) => change({ store: e.target.value })}
                    />
                  </label>
                  <label>
                    Responsável pela análise *
                    <input
                      value={d.manager}
                      maxLength={100}
                      onChange={(e) => change({ manager: e.target.value })}
                    />
                  </label>
                  <label>
                    Data
                    <input
                      type="date"
                      value={d.date}
                      onChange={(e) => change({ date: e.target.value })}
                    />
                  </label>
                  <label>
                    Período analisado
                    <input
                      value={d.period}
                      maxLength={100}
                      onChange={(e) => change({ period: e.target.value })}
                    />
                  </label>
                </div>
                <details>
                  <summary>Faixas de referência da gestão</summary>
                  <p>
                    São padrões editáveis deste diagnóstico, não limites
                    oficiais do iFood. Selecionar uma faixa não muda
                    automaticamente a severidade do catálogo.
                  </p>
                  {Object.entries(rangeDefaults).map(([kind, config]) => (
                    <div className="diag-range-settings" key={kind}>
                      <b>
                        {config.label} ({config.unit})
                      </b>
                      {(d.rangePresets[kind] || config.ranges).map(
                        (range, i) => (
                          <input
                            aria-label={config.label + " - faixa " + (i + 1)}
                            key={i}
                            value={range}
                            maxLength={100}
                            onChange={(e) =>
                              change({
                                rangePresets: {
                                  ...d.rangePresets,
                                  [kind]: (
                                    d.rangePresets[kind] || config.ranges
                                  ).map((r, j) =>
                                    j === i ? e.target.value : r,
                                  ),
                                },
                              })
                            }
                          />
                        ),
                      )}
                    </div>
                  ))}
                </details>
              </section>
              <div className="diag-selection-summary">
                {d.sections.filter((s) => s.status !== "pending").length} de{" "}
                {diagnosticCatalog.length} áreas avaliadas ·{" "}
                {d.sections.reduce((n, s) => n + s.points.length, 0)} pontos
                marcados
              </div>
              {diagnosticCatalog.map((area, index) => {
                const s = d.sections.find((s) => s.id === area.id)!;
                return (
                  <section
                    className="panel diag-area-panel"
                    role="region"
                    aria-label={area.title}
                    key={area.id}
                  >
                    <div className="diag-area-title">
                      <span className="diag-area-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{area.title}</h3>
                        <small>
                          O status é calculado pelas opções marcadas.
                        </small>
                      </div>
                      <span className={"diag-state diag-state-" + s.status}>
                        {diagnosticStatus[s.status]}
                      </span>
                    </div>
                    <button
                      className="secondary"
                      aria-pressed={s.checked}
                      disabled={s.points.length > 0}
                      title={
                        s.points.length
                          ? "Desmarque os pontos antes de declarar a área adequada."
                          : ""
                      }
                      onClick={() => editArea(s.id, { checked: !s.checked })}
                    >
                      {s.checked
                        ? "✓ Conferi, sem problemas"
                        : "Conferi, sem problemas"}
                    </button>
                    <div className="diag-checks diag-problem-grid">
                      {area.options.map((option) => {
                        const point = s.points.find(
                          (p) => p.optionId === option.id,
                        );
                        return (
                          <div
                            className={
                              "diag-option " + (point ? "is-checked" : "")
                            }
                            key={option.id}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={!!point}
                                onChange={(e) =>
                                  toggle(s, option.id, e.target.checked)
                                }
                              />
                              <span>{option.text}</span>
                              <small
                                className={
                                  "diag-severity sev-" + option.severity
                                }
                              >
                                {option.severity === "A"
                                  ? "Alta"
                                  : option.severity === "M"
                                    ? "Média"
                                    : "Baixa"}
                              </small>
                            </label>
                            {point && quickFields(s, point)}
                          </div>
                        );
                      })}
                    </div>
                    <details
                      className="diag-optional"
                      open={s.points.some((p) => !p.optionId)}
                    >
                      <summary>
                        Outro (opcional)
                        {s.points.some((p) => !p.optionId)
                          ? " · contém registros"
                          : ""}
                      </summary>
                      {s.points
                        .filter((p) => !p.optionId)
                        .map((p) => (
                          <div className="diag-other" key={p.id}>
                            <label>
                              Título do ponto
                              <input
                                maxLength={180}
                                value={p.title}
                                onChange={(e) =>
                                  editPoint(s.id, p.id, {
                                    title: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Evidência
                              <textarea
                                value={p.evidence}
                                maxLength={2500}
                                onChange={(e) =>
                                  editPoint(s.id, p.id, {
                                    evidence: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Encaminhamento
                              <textarea
                                value={p.action}
                                maxLength={2500}
                                onChange={(e) =>
                                  editPoint(s.id, p.id, {
                                    action: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="diag-form-grid">
                              <label>
                                Prioridade
                                <select
                                  value={p.severity}
                                  onChange={(e) =>
                                    editPoint(s.id, p.id, {
                                      severity: e.target.value as
                                        "A" | "M" | "B",
                                    })
                                  }
                                >
                                  <option value="A">Alta · 7 dias</option>
                                  <option value="M">Média · 30 dias</option>
                                  <option value="B">Baixa · 60 dias</option>
                                </select>
                              </label>
                              <label>
                                KPI
                                <input
                                  value={p.kpi}
                                  maxLength={250}
                                  onChange={(e) =>
                                    editPoint(s.id, p.id, {
                                      kpi: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </div>
                            {quickFields(s, p)}
                            <button
                              className="text-button"
                              onClick={() =>
                                editArea(s.id, {
                                  points: s.points.filter(
                                    (point) => point.id !== p.id,
                                  ),
                                })
                              }
                            >
                              Remover este ponto
                            </button>
                          </div>
                        ))}
                      <button
                        className="secondary"
                        onClick={() =>
                          editArea(s.id, {
                            points: [...s.points, newOtherPoint()],
                          })
                        }
                      >
                        Adicionar outro ponto
                      </button>
                    </details>
                    <div className="diag-upload">
                      <label>
                        Anexar print da área
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          disabled={s.images.length >= 6}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              setImageEdit({
                                src: URL.createObjectURL(file),
                                areaId: s.id,
                              });
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <small>
                        Até 6 prints. Cada print fica vinculado aos pontos
                        marcados nesta área.
                      </small>
                      {s.images.map((image, i) => (
                        <div className="diag-image-editor" key={image.url}>
                          <a href={image.url} target="_blank" rel="noreferrer">
                            <img
                              src={image.url}
                              alt={"Print " + (i + 1) + " de " + area.title}
                            />
                          </a>
                          <span>
                            Print {i + 1} · {image.pointIds.length} pontos
                            vinculados
                          </span>
                          <button
                            className="secondary"
                            onClick={() =>
                              setImageEdit({
                                src: image.url,
                                areaId: s.id,
                                index: i,
                              })
                            }
                          >
                            Recortar / ocultar dados
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              editArea(s.id, {
                                images: s.images.filter((_, j) => j !== i),
                              })
                            }
                          >
                            Remover print
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
              <section className="panel diag-executive">
                <h3>Resumo executivo automático</h3>
                <p>
                  {summary.assessed} de {summary.total} áreas avaliadas ·{" "}
                  {summary.counts.critical} com prioridade alta ·{" "}
                  {summary.counts.attention} em atenção · {summary.counts.good}{" "}
                  adequadas.
                </p>
                <ol>
                  {summary.priorities.map(({ areaId, point, evidence }) => (
                    <li key={point.id}>
                      <strong>
                        {areaTitle(areaId)} — {point.title}
                      </strong>
                      <p>{evidence}</p>
                    </li>
                  ))}
                </ol>
                {!summary.points.length && (
                  <p>Marque os pontos para gerar as prioridades.</p>
                )}
              </section>
              <section className="panel">
                <h3>Plano de execução</h3>
                {warnings.length > 0 && (
                  <div className="notice" role="status">
                    <strong>Conferência do plano</strong>
                    <ul>
                      {warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p>
                  As novas marcações geram ações automaticamente. Ajuste apenas
                  quando necessário.
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    const generated = suggestedDiagnosticActions(d);
                    change({
                      actions: [
                        ...d.actions,
                        ...generated.filter(
                          (a) =>
                            !d.actions.some(
                              (old) =>
                                old.pointId === a.pointId &&
                                old.areaId === a.areaId,
                            ),
                        ),
                      ],
                    });
                  }}
                >
                  Completar ações faltantes
                </button>
                {d.actions.map((a, i) => (
                  <details className="diag-action-editor" key={a.id}>
                    <summary>
                      {a.days} dias · {areaTitle(a.areaId)} · {a.title}
                    </summary>
                    {a.legacy && (
                      <p>
                        Encaminhamento preservado do diagnóstico anterior. Prazo
                        original: {a.deadline || "não informado"}.
                      </p>
                    )}
                    <label>
                      Ação
                      <textarea
                        value={a.description}
                        maxLength={2500}
                        onChange={(e) =>
                          change({
                            actions: d.actions.map((x, j) =>
                              j === i
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="diag-form-grid">
                      <label>
                        Responsável
                        <input
                          maxLength={100}
                          value={a.owner}
                          onChange={(e) =>
                            change({
                              actions: d.actions.map((x, j) =>
                                j === i ? { ...x, owner: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Prazo
                        <select
                          value={a.days}
                          onChange={(e) =>
                            change({
                              actions: d.actions.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      days: Number(e.target.value) as
                                        7 | 30 | 60,
                                      deadline: e.target.value + " dias",
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          <option value={7}>7 dias</option>
                          <option value={30}>30 dias</option>
                          <option value={60}>60 dias</option>
                        </select>
                      </label>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        change({ actions: d.actions.filter((_, j) => j !== i) })
                      }
                    >
                      Remover ação
                    </button>
                  </details>
                ))}
              </section>
              <section className="panel">
                <label className="diag-review">
                  <input
                    type="checkbox"
                    checked={d.reviewed}
                    onChange={(e) =>
                      change({
                        reviewed: e.target.checked,
                        migration: d.migration
                          ? { ...d.migration, needsReview: !e.target.checked }
                          : undefined,
                      })
                    }
                  />
                  Conferi as informações, os prints e as recomendações deste
                  diagnóstico.
                </label>
                <button
                  disabled={!diagnosticReady(d)}
                  onClick={() => setPreview(true)}
                >
                  Conferir PDF
                </button>
              </section>
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}
