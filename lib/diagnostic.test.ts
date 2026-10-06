import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  newDiagnostic,
  diagnosticSchema,
  diagnosticReady,
  activeSections,
  suggestedDiagnosticActions,
} from "./diagnostic";
import { DatabaseSync } from "node:sqlite";
const state = vi.hoisted(() => ({
  owner: "alice",
  db: null as unknown as DatabaseSync,
}));
vi.mock("@/lib/team", () => ({
  access: async () => ({ subject: state.owner }),
  AccessError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/storage", () => ({
  sameOrigin: () => {},
  bucket: () => ({ head: async () => null }),
  fail: (e: Error & { status?: number }) =>
    Response.json({ error: e.message }, { status: e.status || 503 }),
  database: () => ({
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        first: async () => state.db.prepare(sql).get(...(values as never[])),
        all: async () => ({
          results: state.db.prepare(sql).all(...(values as never[])),
        }),
        run: async () => ({
          meta: {
            changes: state.db.prepare(sql).run(...(values as never[])).changes,
          },
        }),
      }),
    }),
  }),
}));
import { GET, POST, DELETE } from "../app/api/diagnostics/route";
function draft() {
  const d = newDiagnostic();
  d.store = "Loja fictícia";
  d.manager = "Gestão";
  return d;
}
function request(d: unknown, version = "") {
  return new Request("https://test/api/diagnostics", {
    method: "POST",
    headers: { "X-Diagnostic-Version": version },
    body: JSON.stringify(d),
  });
}
beforeEach(() => {
  state.db?.close();
  state.db = new DatabaseSync(":memory:");
  state.db.exec(
    "CREATE TABLE diagnostics(id TEXT PRIMARY KEY,owner TEXT,payload TEXT,updated TEXT)",
  );
  state.owner = "alice";
});
describe("diagnóstico inicial", () => {
  it("não inventa avaliações nem ações para formulário vazio", () => {
    const d = draft();
    expect(activeSections(d)).toEqual([]);
    expect(suggestedDiagnosticActions(d)).toEqual([]);
    expect(diagnosticReady(d)).toBe(false);
  });
  it("valida seções únicas, limites e endereços de imagens", () => {
    const d = draft();
    expect(diagnosticSchema.safeParse(d).success).toBe(true);
    d.sections[1] = d.sections[0];
    expect(diagnosticSchema.safeParse(d).success).toBe(false);
    const bad = draft();
    bad.sections[0].images = [{ url: "https://other/image.png", caption: "" }];
    expect(diagnosticSchema.safeParse(bad).success).toBe(false);
  });
  it("prioriza áreas críticas e preserva recomendação manual", () => {
    const d = draft();
    d.sections[0].status = "attention";
    d.sections[1].status = "critical";
    d.sections[1].recommendation = "Recomendação conferida";
    const a = suggestedDiagnosticActions(d);
    expect(a[0].priority).toBe("high");
    expect(a[0].description).toBe("Recomendação conferida");
    d.reviewed = true;
    expect(diagnosticReady(d)).toBe(true);
  });
  it("salva e reabre sem expor registros de outro integrante", async () => {
    const d = draft();
    expect((await POST(request(d))).status).toBe(200);
    expect(
      (await (await GET(new Request("https://test"))).json()) as unknown[],
    ).toHaveLength(1);
    state.owner = "bob";
    expect(
      (await (await GET(new Request("https://test"))).json()) as unknown[],
    ).toHaveLength(0);
    expect((await POST(request(d))).status).toBe(404);
    expect(
      (
        await DELETE(
          new Request("https://test?id=" + d.id, {
            headers: { "X-Diagnostic-Version": "fake" },
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("bloqueia atualização desatualizada e permite edição e exclusão da versão atual", async () => {
    const d = draft();
    const first = (await (await POST(request(d))).json()) as {
      updated: string;
    };
    expect((await POST(request({ ...d, summary: "nova" }))).status).toBe(409);
    const r = await POST(request({ ...d, summary: "nova" }, first.updated));
    expect(r.status).toBe(200);
    const next = (await r.json()) as { updated: string };
    expect(
      (
        await DELETE(
          new Request("https://test?id=" + d.id, {
            headers: { "X-Diagnostic-Version": first.updated },
          }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await DELETE(
          new Request("https://test?id=" + d.id, {
            headers: { "X-Diagnostic-Version": next.updated },
          }),
        )
      ).status,
    ).toBe(200);
  });
  it("rejeita print de outra conta e conferência incompleta", async () => {
    const d = draft();
    d.reviewed = true;
    expect((await POST(request(d))).status).toBe(400);
    d.reviewed = false;
    d.sections[0].images = [
      { url: "/api/diagnostic-uploads?id=" + crypto.randomUUID(), caption: "" },
    ];
    expect((await POST(request(d))).status).toBe(400);
  });
});
