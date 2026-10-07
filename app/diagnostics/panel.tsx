"use client";
import { useEffect, useState } from "react";
import {
  Diagnostic,
  SavedDiagnostic,
  newDiagnostic,
  diagnosticSections,
  diagnosticStatus,
  suggestedDiagnosticActions,
  diagnosticReady,
  activeSections,
  toggleDiagnosticProblem,
} from "@/lib/diagnostic";
import DiagnosticDocument from "./document";
import { downloadReport } from "@/lib/download";
import "./diagnostics.css";
export default function DiagnosticPanel() {
  const [d, setD] = useState<Diagnostic>(newDiagnostic),
    [version, setVersion] = useState(""),
    [rows, setRows] = useState<SavedDiagnostic[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false);
  function change(p: Partial<Diagnostic>) {
    setD((v) => ({ ...v, ...p, reviewed: p.reviewed ?? false }));
    setDirty(true);
  }
  async function load() {
    const r = await fetch("/api/diagnostics", { cache: "no-store" });
    const v = (await r.json()) as SavedDiagnostic[] & { error?: string };
    if (!r.ok) throw new Error(v.error);
    setRows(v);
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
  async function save(copy = false) {
    setBusy(true);
    setMessage("");
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
      const result = (await r.json()) as { updated: string; error?: string };
      if (!r.ok) throw new Error(result.error);
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
  async function upload(index: number, file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/diagnostic-uploads", {
          method: "POST",
          body: form,
        }),
        data = (await r.json()) as { url: string; error?: string };
      if (!r.ok) throw new Error(data.error);
      change({
        sections: d.sections.map((s, i) =>
          i === index
            ? { ...s, images: [...s.images, { url: data.url, caption: "" }] }
            : s,
        ),
      });
      setMessage(
        "Print anexado. Salve o diagnóstico para guardar a alteração.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(item?: SavedDiagnostic) {
    if (
      dirty &&
      !window.confirm("Descartar as alterações não salvas deste diagnóstico?")
    )
      return;
    setD(item || newDiagnostic());
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
        }),
        v = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(v.error);
      if (d.id === item.id) {
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
  async function pdf() {
    setBusy(true);
    try {
      const file = await downloadReport(
        "Diagnostico-" + d.store,
        "#diagnostic-document",
      );
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
  return (
    <div className="diagnostic-workspace">
      <div className="diag-toolbar">
        <div>
          <h2>Diagnósticos de entrada</h2>
          <p>
            Avalie a loja antes de iniciar a gestão. Cada integrante acessa os
            diagnósticos que criou.
          </p>
        </div>
        <button className="secondary" disabled={busy} onClick={() => open()}>
          Novo diagnóstico
        </button>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <div className="diag-work-grid">
        <aside className="panel diag-history">
          <h3>Meus diagnósticos</h3>
          {!rows.length && <p>Nenhum diagnóstico salvo ainda.</p>}
          {rows.map((item) => (
            <div
              className={
                "diag-history-item " + (item.id === d.id ? "selected" : "")
              }
              key={item.id}
            >
              <button
                disabled={busy}
                className="secondary"
                onClick={() => open(item)}
              >
                {item.store}
                <small>
                  {item.date.split("-").reverse().join("/")} ·{" "}
                  {item.reviewed ? "Conferido" : "Rascunho"}
                </small>
              </button>
              <button
                disabled={busy}
                className="secondary"
                aria-label={"Excluir diagnóstico de " + item.store}
                onClick={() => void remove(item)}
              >
                Excluir
              </button>
            </div>
          ))}
        </aside>
        <div>
          <div className="panel diag-controls">
            <div className="diag-button-row">
              <button
                disabled={busy}
                className={!preview ? "" : "secondary"}
                onClick={() => setPreview(false)}
              >
                Preencher diagnóstico
              </button>
              <button
                disabled={busy}
                className={preview ? "" : "secondary"}
                onClick={() => setPreview(true)}
              >
                Prévia do diagnóstico
              </button>
              <span>
                {dirty
                  ? "Alterações não salvas"
                  : version
                    ? "Salvo"
                    : "Novo rascunho"}
              </span>
            </div>
            <div className="diag-button-row">
              <button
                disabled={busy || !d.store.trim()}
                onClick={() => void save()}
              >
                Salvar diagnóstico
              </button>
              <button
                disabled={busy || !d.store.trim()}
                className="secondary"
                onClick={() => void save(true)}
              >
                Salvar como cópia
              </button>
              {preview && (
                <button
                  disabled={busy || !diagnosticReady(d)}
                  onClick={() => void pdf()}
                >
                  {busy ? "Aguarde…" : "Gerar PDF do diagnóstico"}
                </button>
              )}
            </div>
          </div>
          {preview ? (
            <>
              <p className="diag-preview-help">
                Confira os textos e os prints antes de compartilhar. Para
                liberar o PDF, preencha loja e responsável, avalie uma área e
                marque a conferência no formulário.
              </p>
              <div className="diag-preview-scroll">
                <DiagnosticDocument d={d} />
              </div>
            </>
          ) : (
            <fieldset disabled={busy}>
              <section className="panel">
                <h3>Identificação da loja</h3>
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
                    Data do diagnóstico
                    <input
                      type="date"
                      value={d.date}
                      onChange={(e) => change({ date: e.target.value })}
                    />
                  </label>
                  <label>
                    Período analisado
                    <input
                      placeholder="Ex.: agosto e setembro de 2026"
                      value={d.period}
                      maxLength={100}
                      onChange={(e) => change({ period: e.target.value })}
                    />
                  </label>
                </div>
                <details className="diag-optional">
                  <summary>Adicionar resumo geral (opcional)</summary>
                  <label>
                    Visão executiva
                    <textarea
                      maxLength={700}
                      rows={4}
                      placeholder="Resuma a situação da loja e a principal prioridade para o início da gestão."
                      value={d.summary}
                      onChange={(e) => change({ summary: e.target.value })}
                    />
                    <small>{d.summary.length}/700</small>
                  </label>
                </details>
              </section>
              <section className="panel">
                <h3>Marque os problemas que encontrou</h3>
                <p>
                  Siga a ordem do diagnóstico: escolha os problemas, anexe o
                  print da área e avance. Os itens marcados aparecem no PDF
                  abaixo do print. Você só escreve se quiser acrescentar algo.
                </p>
                <div className="diag-selection-summary" role="status">
                  {d.sections.reduce((n, s) => n + s.checks.length, 0)}{" "}
                  problemas marcados ·{" "}
                  {d.sections.filter((s) => s.status !== "pending").length} de
                  10 áreas avaliadas
                </div>
                {d.sections.map((s, index) => {
                  const def = diagnosticSections.find((t) => t.id === s.id)!;
                  const update = (p: Partial<typeof s>) =>
                    change({
                      sections: d.sections.map((v, i) =>
                        i === index ? { ...v, ...p } : v,
                      ),
                    });
                  return (
                    <section
                      className="diag-section-editor"
                      key={s.id}
                      aria-label={def.title}
                    >
                      <div className="diag-area-title">
                        <span className="diag-area-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h4>{def.title}</h4>
                          <p>{def.hint}</p>
                        </div>
                        <span className={"diag-state diag-state-" + s.status}>
                          {s.checks.length
                            ? `${s.checks.length} problema(s)`
                            : diagnosticStatus[s.status]}
                        </span>
                      </div>
                      <div className="diag-checks diag-problem-grid">
                        {[...new Set([...def.checks, ...s.checks])].map(
                          (text) => (
                            <label
                              key={text}
                              className={
                                s.checks.includes(text) ? "is-checked" : ""
                              }
                            >
                              <input
                                type="checkbox"
                                checked={s.checks.includes(text)}
                                onChange={(e) =>
                                  update(
                                    toggleDiagnosticProblem(
                                      s,
                                      text,
                                      e.target.checked,
                                    ),
                                  )
                                }
                              />
                              <span>{text}</span>
                            </label>
                          ),
                        )}
                      </div>
                      <div className="diag-area-options">
                        <label>
                          <input
                            type="checkbox"
                            disabled={s.checks.length > 0}
                            checked={s.status === "good"}
                            onChange={(e) =>
                              update({
                                status: e.target.checked ? "good" : "pending",
                              })
                            }
                          />
                          Conferi e não encontrei problemas nesta área
                        </label>
                        {s.checks.length > 0 && (
                          <label>
                            <input
                              type="checkbox"
                              checked={s.status === "critical"}
                              onChange={(e) =>
                                update({
                                  status: e.target.checked
                                    ? "critical"
                                    : "attention",
                                })
                              }
                            />
                            Tratar como prioridade alta
                          </label>
                        )}
                      </div>
                      <details className="diag-optional">
                        <summary>
                          Outro problema ou observação (opcional)
                          {s.notes ? " · preenchido" : ""}
                        </summary>
                        <label>
                          Detalhes adicionais
                          <textarea
                            maxLength={900}
                            rows={3}
                            value={s.notes}
                            placeholder="Descreva somente o que não está nas opções acima."
                            onChange={(e) => update({ notes: e.target.value })}
                          />
                          <small>{s.notes.length}/900</small>
                        </label>
                      </details>
                      <details className="diag-optional">
                        <summary>
                          Recomendação para esta área (opcional)
                          {s.recommendation ? " · preenchida" : ""}
                        </summary>
                        <label>
                          O que fazer
                          <textarea
                            maxLength={600}
                            rows={3}
                            value={s.recommendation}
                            onChange={(e) =>
                              update({ recommendation: e.target.value })
                            }
                          />
                        </label>
                        <button
                          className="secondary"
                          disabled={!!s.recommendation}
                          onClick={() => update({ recommendation: def.action })}
                        >
                          Inserir sugestão de ação
                        </button>
                      </details>
                      <div className="diag-upload">
                        <label>
                          Anexar print (PNG/JPG, até 10 MB, máximo 3 por área)
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            disabled={s.images.length >= 3}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void upload(index, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {s.images.map((img, i) => (
                          <div className="diag-image-editor" key={img.url}>
                            <img src={img.url} alt="Print anexado" />
                            <label>
                              Legenda
                              <input
                                maxLength={160}
                                value={img.caption}
                                onChange={(e) =>
                                  update({
                                    images: s.images.map((v, j) =>
                                      j === i
                                        ? { ...v, caption: e.target.value }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </label>
                            <button
                              className="secondary"
                              onClick={() =>
                                update({
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
              </section>
              <section className="panel">
                <div className="diag-toolbar">
                  <div>
                    <h3>Plano de ação inicial</h3>
                    <p>Defina prioridades, responsáveis e prazos.</p>
                  </div>
                  <button
                    className="secondary"
                    disabled={!!d.actions.length}
                    onClick={() =>
                      change({ actions: suggestedDiagnosticActions(d) })
                    }
                  >
                    Montar plano com os problemas marcados
                  </button>
                </div>
                {d.actions.map((a, i) => {
                  const update = (p: Partial<typeof a>) =>
                    change({
                      actions: d.actions.map((v, j) =>
                        i === j ? { ...v, ...p } : v,
                      ),
                    });
                  return (
                    <div className="diag-action-editor" key={i}>
                      <label>
                        Ação {i + 1}
                        <input
                          maxLength={140}
                          value={a.title}
                          onChange={(e) => update({ title: e.target.value })}
                        />
                      </label>
                      <label>
                        O que fazer
                        <textarea
                          maxLength={500}
                          rows={3}
                          value={a.description}
                          onChange={(e) =>
                            update({ description: e.target.value })
                          }
                        />
                      </label>
                      <div className="diag-form-grid">
                        <label>
                          Prioridade
                          <select
                            value={a.priority}
                            onChange={(e) =>
                              update({
                                priority: e.target.value as typeof a.priority,
                              })
                            }
                          >
                            <option value="high">Alta</option>
                            <option value="medium">Média</option>
                            <option value="low">Baixa</option>
                          </select>
                        </label>
                        <label>
                          Responsável
                          <input
                            maxLength={100}
                            value={a.owner}
                            onChange={(e) => update({ owner: e.target.value })}
                          />
                        </label>
                        <label>
                          Prazo
                          <input
                            maxLength={60}
                            value={a.deadline}
                            onChange={(e) =>
                              update({ deadline: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <button
                        className="secondary"
                        onClick={() =>
                          change({
                            actions: d.actions.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remover ação
                      </button>
                    </div>
                  );
                })}
                <button
                  className="secondary"
                  disabled={d.actions.length >= 20}
                  onClick={() =>
                    change({
                      actions: [
                        ...d.actions,
                        {
                          title: "",
                          description: "",
                          priority: "medium",
                          owner: d.manager,
                          deadline: "Primeiros 30 dias",
                        },
                      ],
                    })
                  }
                >
                  Adicionar ação
                </button>
              </section>
              <section className="panel">
                <label className="diag-review">
                  <input
                    type="checkbox"
                    checked={d.reviewed}
                    onChange={(e) => change({ reviewed: e.target.checked })}
                  />
                  Conferi as informações, os prints e as recomendações deste
                  diagnóstico.
                </label>
                <p>
                  {activeSections(d).length} de 10 áreas incluídas. Alterações
                  posteriores exigem nova conferência.
                </p>
                <button onClick={() => setPreview(true)}>
                  Visualizar diagnóstico
                </button>
              </section>
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}
