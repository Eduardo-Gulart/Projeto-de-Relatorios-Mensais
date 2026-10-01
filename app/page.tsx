"use client";
import AppNav from "./app-nav";
import MonthCloseBanner from "./month-close-banner";
import { useQualityPrompt } from "./use-quality-prompt";
import { ImageQualityCancelled } from "@/lib/image-quality";
import { downloadCSV } from "@/lib/csv";
import NewStore from "./new-store";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Plus,
  Save,
  Printer,
  CheckCircle2,
  Store,
  ArrowUpRight,
  ImageIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Report,
  Category,
  Evidence,
  example,
  blank,
  fields,
  labels,
  money,
  num,
  values,
  month,
  variation,
  issues,
} from "@/lib/report";
import { readImage } from "@/lib/ocr";
import ReportPreview from "./report-preview";
import EditorialEditor from "./report-v2/editor";
import StrategyEditor from "./strategy-editor";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import BackupPanel from "./backup-panel";
import { useSession } from "@/lib/use-session";
import { usePersistence } from "@/lib/use-persistence";
function Choice({
  value,
  onChange,
  items,
  disabled = false,
}: {
  disabled?: boolean;
  value: string;
  onChange: (v: string) => void;
  items: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="picker">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
async function api<T = Report[]>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}
export default function Home() {
  const qualityPrompt = useQualityPrompt();
  const { session, error: accessError, addStore } = useSession();
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null),
    [deleteError, setDeleteError] = useState("");
  const [discardConfirm, setDiscardConfirm] = useState(false),
    [discardRecovery, setDiscardRecovery] = useState(false);
  const [pdfFile, setPdfFile] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [r, setR] = useState<Report | null>(null),
    [tab, setTab] = useState("editor"),
    [history, setHistory] = useState<Report[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [dirty, setDirty] = useState(false),
    [selected, setSelected] = useState(""),
    [category, setCategory] = useState<Category>("finance"),
    [period, setPeriod] = useState("2026-08");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setPdfFile(null);
  }, [r]);
  useEffect(
    () => () => {
      if (pdfFile) URL.revokeObjectURL(pdfFile.url);
    },
    [pdfFile],
  );
  const persistence = usePersistence(
    r,
    setR,
    dirty,
    setDirty,
    busy,
    setHistory,
    setMessage,
    (next) => {
      setSelected(next.evidence[0]?.id || "");
      setPeriod(next.current);
    },
  );
  const dashboardNavigation = useRef(false);
  useEffect(() => {
    if (!persistence.ready || dashboardNavigation.current) return;
    const id = new URLSearchParams(window.location.search).get("report");
    if (!id) return;
    dashboardNavigation.current = true;
    if (dirty) {
      setMessage(
        "Há um rascunho recuperado nesta aba. Salve ou resolva esse rascunho antes de abrir o relatório solicitado pelo dashboard.",
      );
      setTab("history");
      return;
    }
    const requested = history.find((item) => item.id === id);
    if (!requested) {
      setMessage(
        "O relatório solicitado não está disponível para sua conta. Consulte o histórico.",
      );
      setTab("history");
      return;
    }
    persistence.reset(requested);
    setR(requested);
    setSelected(requested.evidence[0]?.id || "");
    setPeriod(requested.current);
    setTab("editor");
    setMessage(
      "Relatório aberto pelo dashboard. Confira os prints e finalize a conferência quando estiver pronto.",
    );
  }, [persistence.ready, history, dirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => {
    if (!r) return;
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, opts: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const c = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: "read_current_report",
          description:
            "Lê os dados e as pendências do relatório exibido, sem alterá-lo.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: (v: unknown) => {
            if (!v || typeof v !== "object" || Object.keys(v).length)
              throw new Error("Use um objeto vazio.");
            return {
              store: r.store,
              previous: r.previous,
              current: r.current,
              pending: issues(r),
              evidence: r.evidence.map((e) => ({
                category: e.category,
                period: e.period,
                values: e.values,
                confirmed: e.confirmed,
              })),
            };
          },
        },
        { signal: c.signal },
      ),
    ).catch(() => {});
    return () => c.abort();
  }, [r]);
  if (accessError)
    return (
      <main className="workspace">
        <h1>Acesso ao Relata</h1>
        <p role="alert">{accessError}</p>
        <a href="/signin-with-chatgpt?return_to=/">Entrar com minha conta</a>
      </main>
    );
  if (!r || !session)
    return (
      <main>
        <p>Carregando seu espaço de relatórios…</p>
      </main>
    );
  const report = r;
  const current = values(r, "finance", r.current),
    previous = values(r, "finance", r.previous),
    sales = values(r, "sales", r.current);
  const pending = issues(r);
  const active = r.evidence.find((e) => e.id === selected);
  const reviewed = r.evidence.filter((e) => e.confirmed).length;
  function change(p: Partial<Report>) {
    setR((x) => (x ? { ...x, ...p, status: "draft" } : x));
    setDirty(true);
    setMessage("");
  }
  function editEvidence(id: string, p: Partial<Evidence>) {
    change({
      evidence: report.evidence.map((e) => (e.id === id ? { ...e, ...p } : e)),
    });
  }
  async function save(final = false) {
    if (!report.store.trim()) {
      setMessage("Informe o nome da loja para salvar.");
      return;
    }
    if (final && pending.length) {
      setMessage(pending.join(" "));
      return;
    }
    setBusy("Salvando relatório…");
    try {
      const payload = {
        ...report,
        status: final ? "reviewed" : "draft",
      } as Report;
      setR(payload);
      setDirty(true);
      await persistence.persist(payload);
      setMessage(
        final
          ? "Relatório conferido e salvo. Abra a prévia para salvar em PDF."
          : "Rascunho salvo.",
      );
      if (final) setTab("preview");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function createNext(source: Report) {
    if (dirty) {
      setMessage(
        "Aguarde o salvamento das alterações antes de criar o próximo mês.",
      );
      return;
    }
    setBusy("Preparando próximo mês…");
    try {
      const result = await api<{ report: Report; existing: boolean }>(
        "/api/reports/next",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: source.id }),
        },
      );
      load(result.report);
      setHistory(await api("/api/reports"));
      setMessage(
        result.existing
          ? "Este mês já possui um relatório. Abrimos a versão existente."
          : "Próximo mês criado. Os prints do mês anterior foram aproveitados; envie os novos prints e preencha a análise.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function download() {
    setBusy("Gerando PDF…");
    try {
      const { downloadReport } = await import("@/lib/download");
      setPdfFile(
        await downloadReport(
          report.store + "_" + report.previous + "_" + report.current,
        ),
      );
    } catch (e) {
      setMessage("Não foi possível gerar o PDF: " + (e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function load(next: Report) {
    if (dirty) {
      setMessage("Salve o rascunho atual antes de abrir outro relatório.");
      return;
    }
    persistence.reset(next);
    setR(next);
    setPeriod(next.current);
    setSelected(next.evidence[0]?.id || "");
    setTab("editor");
    setMessage("");
  }
  async function editReport(item: Report) {
    if (dirty) {
      setMessage(
        "Aguarde o salvamento do relatório aberto antes de editar outro.",
      );
      return;
    }
    setBusy("Abrindo relatório…");
    try {
      const list = await api("/api/reports");
      setHistory(list);
      const latest = list.find((x) => x.id === item.id);
      if (!latest)
        throw new Error(
          "Este relatório já foi excluído. O histórico foi atualizado.",
        );
      load(latest);
      setMessage(
        "Edite os dados abaixo. As alterações serão salvas automaticamente; depois, finalize novamente a conferência.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function deleteReport() {
    if (!deleteTarget || dirty) return;
    const target = deleteTarget;
    setBusy("Excluindo relatório…");
    setDeleteError("");
    try {
      await api("/api/reports?id=" + encodeURIComponent(target.id), {
        method: "DELETE",
        headers: { "X-Report-Version": target.updated || "" },
      });
      persistence.forget(target.id);
      setHistory((items) => items.filter((x) => x.id !== target.id));
      if (report.id === target.id) {
        const next = blank();
        persistence.reset(next);
        setR(next);
        setDirty(false);
        setSelected("");
        setPeriod(next.current);
      }
      setDeleteTarget(null);
      setMessage("Relatório de " + target.store + " excluído.");
    } catch (e) {
      setDeleteError((e as Error).message);
      try {
        setHistory(await api("/api/reports"));
      } catch {}
    } finally {
      setBusy("");
    }
  }
  async function reread(e: Evidence) {
    setBusy("Preparando nova leitura…");
    setMessage("");
    try {
      const response = await fetch(e.url);
      if (!response.ok) throw new Error("Não foi possível abrir este print.");
      const blob = await response.blob();
      const parsed = await readImage(
        new File([blob], e.name, { type: blob.type }),
        e.category,
        setBusy,
        qualityPrompt.confirm,
      );
      const merged = { ...e.values };
      let recovered = 0;
      for (const [key] of fields[e.category])
        if (merged[key] == null && parsed.values[key] != null) {
          merged[key] = parsed.values[key];
          recovered++;
        }
      editEvidence(e.id, {
        values: merged,
        text: parsed.text,
        confirmed: recovered ? false : e.confirmed,
      });
      setMessage(
        `${recovered} campo(s) vazio(s) preenchido(s). Os valores já preenchidos foram preservados. Confira o texto reconhecido abaixo.`,
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (session?.team && !report.storeId) {
      setMessage("Selecione uma loja antes de enviar prints.");
      return;
    }
    if (report.evidence.length + files.length > 12) {
      setMessage("Use até 12 prints por relatório.");
      return;
    }
    const additions: Evidence[] = [];
    let skipped = 0;
    try {
      for (const file of Array.from(files)) {
        if (
          !["image/png", "image/jpeg"].includes(file.type) ||
          file.size > 10485760
        )
          throw new Error("Envie PNG ou JPG de até 10 MB.");
        setBusy("Preparando leitura de " + file.name + "…");
        let parsed = {
          text: "",
          values: Object.fromEntries(
            fields[category].map(([key]) => [key, null]),
          ) as Record<string, number | null>,
        };
        try {
          parsed = await readImage(
            file,
            category,
            setBusy,
            qualityPrompt.confirm,
          );
        } catch (e) {
          if (e instanceof ImageQualityCancelled) {
            skipped++;
            continue;
          }
          parsed.text =
            "Leitura automática indisponível: " +
            (e as Error).message +
            ". Preencha os valores manualmente.";
        }
        setBusy("Salvando " + file.name + "…");
        const form = new FormData();
        form.append("file", file);
        if (report.storeId) form.append("storeId", report.storeId);
        const stored = await api<{ id: string; url: string }>("/api/uploads", {
          method: "POST",
          body: form,
        });
        additions.push({
          id: stored.id,
          name: file.name,
          url: stored.url,
          category,
          period: category === "quality" ? "quality" : period,
          values: parsed.values,
          text: parsed.text,
          confirmed: false,
        });
      }
      setMessage(
        (additions.length
          ? "Prints lidos. Confira os valores, a loja e os períodos. "
          : "") +
          (skipped
            ? skipped +
              " print(s) ignorado(s). Envie uma imagem com melhor qualidade."
            : ""),
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      if (additions.length) {
        setR((x) =>
          x
            ? { ...x, evidence: [...x.evidence, ...additions], status: "draft" }
            : x,
        );
        setSelected(additions[0].id);
        setDirty(true);
      }
      setBusy("");
      if (input.current) input.current.value = "";
    }
  }
  return (
    <main className="workspace">
      <div className="app-ui reports-ui">
        <AppNav active="reports" />
        <div className="heading">
          <div>
            <p className="eyebrow">RELATÓRIOS MENSAIS</p>
            <h1>Relatórios mensais</h1>
            <p>Confira os resultados e gere o PDF de cada loja.</p>
          </div>
          <button
            className="secondary"
            disabled={!!busy}
            onClick={() => load(blank())}
          >
            <Plus size={18} /> Novo relatório
          </button>
        </div>
        {persistence.recovery && !dirty && (
          <div className="notice notice-warning">
            <p>
              Há um rascunho de outra aba neste navegador:{" "}
              {persistence.recovery.store || "Loja sem nome"}. Você pode
              recuperá-lo como uma cópia.
            </p>
            <button className="secondary" onClick={persistence.recover}>
              Recuperar rascunho como cópia
            </button>{" "}
            <button
              className="secondary"
              onClick={() => setDiscardRecovery(true)}
            >
              Descartar rascunho local
            </button>
            {discardRecovery && (
              <div>
                <p>
                  Descartar este rascunho não salvo do navegador? Os relatórios
                  salvos não serão alterados.
                </p>
                <button
                  onClick={() => {
                    persistence.discardRecovery();
                    setDiscardRecovery(false);
                  }}
                >
                  Confirmar descarte do rascunho local
                </button>{" "}
                <button
                  className="secondary"
                  onClick={() => setDiscardRecovery(false)}
                >
                  Manter rascunho
                </button>
              </div>
            )}
          </div>
        )}
        {persistence.conflict && (
          <div className="notice notice-warning">
            <p>
              Há uma versão mais recente salva em outra aba. Suas alterações
              continuam nesta tela.
            </p>
            <button className="secondary" onClick={persistence.copy}>
              Salvar minhas alterações como cópia
            </button>{" "}
            <button
              className="secondary"
              onClick={() => setDiscardConfirm(true)}
            >
              Reabrir versão salva
            </button>
            {discardConfirm && (
              <div>
                <p>
                  Descartar as alterações desta aba e abrir a versão já salva?
                </p>
                <button
                  onClick={() => {
                    void persistence.reopen();
                    setDiscardConfirm(false);
                  }}
                >
                  Descartar alterações desta aba
                </button>{" "}
                <button
                  className="secondary"
                  onClick={() => setDiscardConfirm(false)}
                >
                  Continuar editando
                </button>
              </div>
            )}
          </div>
        )}
        {message && (
          <div
            role="status"
            className={
              "notice " +
              (/^(Não |Falha|Erro|Acesso negado|Envie PNG|Use até)/i.test(
                message,
              )
                ? "notice-error"
                : "notice-info")
            }
          >
            {message}
            {message.includes("Entre na sua conta") && (
              <>
                {" "}
                <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
                  Entrar
                </a>
              </>
            )}
          </div>
        )}
        <MonthCloseBanner report={r} reports={history} />
        <Tabs value={tab} onValueChange={setTab}>
          <div className="toolbar">
            <TabsList>
              <TabsTrigger value="editor">Preparar relatório</TabsTrigger>
              <TabsTrigger value="preview">Prévia do PDF</TabsTrigger>
              <TabsTrigger value="history">
                Lojas e histórico ({history.length})
              </TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
            </TabsList>
            <span className="save-status">
              {dirty
                ? persistence.conflict
                  ? "Conflito entre versões — escolha uma opção acima"
                  : /^(Salvo|Relatório salvo|Novo rascunho)/.test(
                        persistence.status,
                      )
                    ? "Aguardando salvamento…"
                    : persistence.status || "Aguardando salvamento…"
                : r.status === "reviewed"
                  ? "Conferido e salvo"
                  : persistence.status || "Rascunho"}
            </span>
          </div>
          <TabsContent value="editor">
            <fieldset disabled={!!busy}>
              <section className="panel">
                <div className="row">
                  <h2>
                    <Store size={22} />
                    {r.store || "Nova loja"}
                  </h2>
                  <span className="badge">
                    {month(r.previous)} → {month(r.current)}
                  </span>
                </div>
                <div className="stats">
                  <article>
                    <p>Faturamento líquido · mês atual</p>
                    <strong>{money(current.net)}</strong>
                    <small>
                      <ArrowUpRight size={15} />
                      {variation(previous.net, current.net) == null
                        ? "Sem comparação"
                        : num(variation(previous.net, current.net)) +
                          "% sobre o mês anterior"}
                    </small>
                  </article>
                  <article>
                    <p>Total de pedidos · Vendas</p>
                    <strong>{num(sales.orders)}</strong>
                    <small>Fonte: painel de vendas</small>
                  </article>
                  <article>
                    <p>Conferência dos prints</p>
                    <strong>
                      {reviewed}
                      <span> / {r.evidence.length}</span>
                    </strong>
                    <Progress
                      value={
                        r.evidence.length
                          ? (reviewed / r.evidence.length) * 100
                          : 0
                      }
                      aria-label="Prints conferidos"
                      className="mt-4"
                    />
                  </article>
                </div>
                <div className="form-grid">
                  {session.team && (
                    <div>
                      <label>
                        Loja
                        <Choice
                          disabled={!!r.updated || r.evidence.length > 0}
                          value={r.storeId || ""}
                          onChange={(id) => {
                            const store = session.stores.find(
                              (s) => s.id === id,
                            );
                            if (store)
                              change({
                                storeId: id,
                                store: store.name,
                                evidence: [],
                              });
                          }}
                          items={session.stores.map((s) => [s.id, s.name])}
                        />
                      </label>
                      <NewStore
                        disabled={
                          !!busy || !!r.updated || r.evidence.length > 0
                        }
                        onCreated={(store) => {
                          addStore(store);
                          change({
                            storeId: store.id,
                            store: store.name,
                            evidence: [],
                          });
                        }}
                      />
                      {!session.stores.length && (
                        <p className="muted">
                          Adicione sua primeira loja para começar.
                        </p>
                      )}
                      {(r.updated || r.evidence.length > 0) && (
                        <p className="muted">
                          Para outra loja, abra um novo relatório.
                        </p>
                      )}
                    </div>
                  )}
                  {(
                    [
                      ["store", "Loja"],
                      ["client", "Cliente"],
                      ["manager", "Gestor"],
                    ] as const
                  )
                    .filter(([k]) => !session.team || k !== "store")
                    .map(([k, label]) => (
                      <label key={k}>
                        {label}
                        <input
                          value={r[k]}
                          onChange={(e) => change({ [k]: e.target.value })}
                        />
                      </label>
                    ))}
                  <label>
                    Início da gestão
                    <input
                      type="date"
                      value={r.started}
                      onChange={(e) => change({ started: e.target.value })}
                    />
                  </label>
                  <label>
                    Mês anterior
                    <input
                      type="month"
                      value={r.previous}
                      onChange={(e) => change({ previous: e.target.value })}
                    />
                  </label>
                  <label>
                    Mês atual
                    <input
                      type="month"
                      value={r.current}
                      onChange={(e) => {
                        change({ current: e.target.value });
                        setPeriod(e.target.value);
                      }}
                    />
                  </label>
                </div>
              </section>
              <section className="panel">
                <div className="row">
                  <div>
                    <p className="eyebrow">01 · FONTES E INDICADORES</p>
                    <h2>Envie e confira os prints</h2>
                  </div>
                  <span className="badge">PNG ou JPG · até 10 MB</span>
                </div>
                <div className="upload-bar">
                  <label>
                    Seção do novo print
                    <Choice
                      value={category}
                      onChange={(v) => setCategory(v as Category)}
                      items={Object.entries(labels) as [string, string][]}
                    />
                  </label>
                  {category !== "quality" && (
                    <label>
                      Mês do novo print
                      <Choice
                        value={period}
                        onChange={setPeriod}
                        items={[
                          [r.previous, month(r.previous)],
                          [r.current, month(r.current)],
                        ]}
                      />
                    </label>
                  )}
                  <button
                    disabled={!!busy}
                    onClick={() => input.current?.click()}
                  >
                    <Upload size={18} /> Enviar e ler prints
                  </button>
                  <input
                    ref={input}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg"
                    hidden
                    onChange={(e) => upload(e.target.files)}
                  />
                </div>
                {busy && (
                  <p role="status" className="notice">
                    {busy}
                  </p>
                )}
                <p className="muted">
                  Envie um print de cada seção por mês e um de qualidade. A
                  leitura sugere valores; a confirmação é sua.
                </p>
                <div className="evidence-layout">
                  <div className="evidence-list">
                    {r.evidence.map((e) => (
                      <button
                        className={
                          "evidence-item " +
                          (e.id === selected ? "selected" : "")
                        }
                        key={e.id}
                        onClick={() => setSelected(e.id)}
                      >
                        {e.confirmed ? (
                          <CheckCircle2 size={19} />
                        ) : (
                          <ImageIcon size={19} />
                        )}
                        <span>
                          <b>{labels[e.category]}</b>
                          <small>
                            {e.category === "quality"
                              ? "Período da qualidade"
                              : month(e.period)}
                          </small>
                        </span>
                      </button>
                    ))}
                    {!r.evidence.length && <p>Nenhum print enviado.</p>}
                  </div>
                  {active && (
                    <div className="evidence-detail">
                      <a href={active.url} target="_blank" rel="noreferrer">
                        <img src={active.url} alt={active.name} />
                      </a>
                      <p className="muted">
                        Clique na imagem para ampliar. {active.name}
                      </p>
                      <div className="form-grid two">
                        <label>
                          Seção
                          <Choice
                            value={active.category}
                            onChange={(v) =>
                              editEvidence(active.id, {
                                category: v as Category,
                                values: Object.fromEntries(
                                  fields[v as Category].map(([k]) => [k, null]),
                                ),
                                period: v === "quality" ? "quality" : r.current,
                                confirmed: false,
                              })
                            }
                            items={Object.entries(labels) as [string, string][]}
                          />
                        </label>
                        {active.category !== "quality" ? (
                          <label>
                            Mês confirmado
                            <Choice
                              value={active.period}
                              onChange={(v) =>
                                editEvidence(active.id, {
                                  period: v,
                                  confirmed: false,
                                })
                              }
                              items={[
                                [r.previous, month(r.previous)],
                                [r.current, month(r.current)],
                              ]}
                            />
                          </label>
                        ) : (
                          <label>
                            Período exibido na qualidade
                            <input
                              placeholder="Ex.: junho a agosto de 2026"
                              value={r.qualityPeriod}
                              onChange={(e) =>
                                change({
                                  qualityPeriod: e.target.value,
                                  evidence: r.evidence.map((x) =>
                                    x.id === active.id
                                      ? { ...x, confirmed: false }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                        {fields[active.category].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <input
                              type="number"
                              step="any"
                              value={active.values[key] ?? ""}
                              placeholder="Não reconhecido"
                              onChange={(e) =>
                                editEvidence(active.id, {
                                  values: {
                                    ...active.values,
                                    [key]:
                                      e.target.value === ""
                                        ? null
                                        : Number(e.target.value),
                                  },
                                  confirmed: false,
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <label className="confirm">
                        <Checkbox
                          checked={active.confirmed}
                          disabled={
                            fields[active.category].some(
                              ([k]) => active.values[k] == null,
                            ) ||
                            (active.category === "quality" && !r.qualityPeriod)
                          }
                          onCheckedChange={(v) =>
                            editEvidence(active.id, { confirmed: v === true })
                          }
                        />{" "}
                        Conferi os valores, a loja e o período deste print.
                      </label>
                      <button
                        className="secondary spaced"
                        disabled={!!busy}
                        onClick={() => reread(active)}
                      >
                        Ler novamente os campos vazios
                      </button>
                      <details>
                        <summary>Texto reconhecido</summary>
                        <pre>{active.text}</pre>
                      </details>
                      <button
                        className="text-button"
                        onClick={() => {
                          change({
                            evidence: r.evidence.filter(
                              (e) => e.id !== active.id,
                            ),
                          });
                          setSelected(
                            r.evidence.find((e) => e.id !== active.id)?.id ||
                              "",
                          );
                        }}
                      >
                        Retirar este print do rascunho
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <section className="panel">
                <p className="eyebrow">02 · ANÁLISE DA LOJA</p>
                <h2>Metas e estratégias</h2>
                <details className="targets">
                  <summary>Ajustar metas do relatório</summary>
                  <div className="form-grid">
                    {Object.keys(r.targets).map((k) => (
                      <label key={k}>
                        {
                          [...fields.funnel, ...fields.quality].find(
                            ([key]) => key === k,
                          )?.[1]
                        }
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.targets[k]}
                          onChange={(e) =>
                            change({
                              targets: {
                                ...r.targets,
                                [k]: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <fieldset className="classification-options">
                  <legend>Classificação geral</legend>
                  <p className="muted">
                    Escolha a avaliação do desempenho da loja.
                  </p>
                  <div>
                    {["Excelente", "Precisa de atenção"].map((option) => (
                      <label
                        key={option}
                        className={
                          "classification-option " +
                          (r.classification === option ? "active" : "")
                        }
                      >
                        <input
                          type="radio"
                          name="classification"
                          value={option}
                          checked={r.classification === option}
                          onChange={() => change({ classification: option })}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {r.classification &&
                    !["Excelente", "Precisa de atenção"].includes(
                      r.classification,
                    ) && (
                      <p className="muted">
                        Classificação anterior mantida: {r.classification}.
                        Escolha uma opção para atualizar.
                      </p>
                    )}
                </fieldset>
                <StrategyEditor
                  value={r.strategies}
                  onChange={(strategies) => change({ strategies })}
                />
              </section>
              <EditorialEditor r={r} onChange={change} />
              <div className="bottom-actions">
                <span>
                  {pending.length
                    ? pending.length + " pendências para concluir"
                    : "Tudo pronto para finalizar"}
                </span>
                <button
                  className="secondary"
                  disabled={!!busy}
                  onClick={() => save()}
                >
                  <Save size={17} /> Salvar rascunho
                </button>
                <button disabled={!!busy} onClick={() => save(true)}>
                  <CheckCircle2 size={17} /> Finalizar e visualizar
                </button>
              </div>
              {pending.length > 0 && (
                <details className="pending">
                  <summary>Ver pendências</summary>
                  <ul>
                    {pending.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              )}
            </fieldset>
          </TabsContent>
          <TabsContent value="preview">
            <div className="preview-toolbar">
              <label>
                Modelo do PDF
                <Choice
                  value={r.layout || "editorial"}
                  onChange={(v) =>
                    change({ layout: v as "classic" | "editorial" })
                  }
                  items={[
                    ["editorial", "Editorial"],
                    ["classic", "Clássico"],
                  ]}
                />
              </label>
              <label className="confirm">
                <Checkbox
                  checked={!!r.includeEvidence}
                  onCheckedChange={(v) => change({ includeEvidence: !!v })}
                />
                Incluir prints no anexo editorial
              </label>
              <p>
                {r.status === "reviewed"
                  ? "Relatório conferido. Seu PDF está pronto para baixar."
                  : "Prévia do rascunho. Conclua a conferência para exportar."}
              </p>
              {pdfFile && (
                <a
                  className="secondary"
                  href={pdfFile.url}
                  download={pdfFile.filename}
                >
                  Salvar PDF gerado
                </a>
              )}
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => downloadCSV(r)}
              >
                Exportar CSV
              </button>
              <button
                disabled={r.status !== "reviewed" || dirty || !!busy}
                onClick={download}
              >
                <Printer size={18} /> {busy || "Gerar PDF"}
              </button>
            </div>
            <ReportPreview r={r} reports={history} />
          </TabsContent>
          <TabsContent value="history">
            <section className="panel">
              <h2>Lojas e relatórios salvos</h2>
              <p className="muted">
                Cada relatório mantém os prints, os dados e as estratégias da
                loja.
              </p>
              {history.length ? (
                history.map((item) => (
                  <div className="history-row" key={item.id}>
                    <div>
                      <b>{item.store}</b>
                      <p>
                        {month(item.previous)} → {month(item.current)} ·{" "}
                        {item.status === "reviewed" ? "Conferido" : "Rascunho"}
                      </p>
                    </div>
                    <div className="backup-actions">
                      <button
                        className="secondary"
                        disabled={!!busy || dirty}
                        onClick={() => editReport(item)}
                      >
                        Editar
                      </button>
                      <button
                        className="delete-report"
                        disabled={!!busy || dirty}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(item);
                        }}
                      >
                        Excluir
                      </button>
                      <button
                        disabled={!!busy || dirty || item.status !== "reviewed"}
                        title={
                          item.status !== "reviewed"
                            ? "Finalize a conferência deste relatório primeiro"
                            : "Aproveitar o mês atual como mês anterior"
                        }
                        onClick={() => createNext(item)}
                      >
                        Criar próximo mês
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p>
                  Nenhum relatório salvo. Crie um novo relatório para começar.
                </p>
              )}
              <button
                className="secondary spaced"
                onClick={() => load(example())}
              >
                Abrir modelo vazio
              </button>
            </section>
          </TabsContent>
          <TabsContent value="backup">
            <BackupPanel
              canRestore={!session.team || session.admin}
              dirty={dirty || !!busy}
              onRestored={setHistory}
            />
          </TabsContent>
        </Tabs>
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !busy) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent className="delete-confirmation reports-dialog">
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está excluindo o relatório de{" "}
              <strong>{deleteTarget?.store}</strong>, de{" "}
              {month(deleteTarget?.previous || "")} a{" "}
              {month(deleteTarget?.current || "")}. Ele será removido do
              histórico e do dashboard. Para recuperá-lo depois, será necessário
              um backup anterior à exclusão.
            </AlertDialogDescription>
            {deleteError && (
              <p role="alert" className="notice notice-error">
                {deleteError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="secondary" disabled={!!busy}>
                Cancelar
              </AlertDialogCancel>
              <button
                disabled={!!busy || dirty || !!deleteError}
                onClick={deleteReport}
              >
                {busy === "Excluindo relatório…"
                  ? "Excluindo…"
                  : "Confirmar exclusão"}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {qualityPrompt.dialog}
      <div className="print-only">
        <ReportPreview r={r} reports={history} />
      </div>
    </main>
  );
}
