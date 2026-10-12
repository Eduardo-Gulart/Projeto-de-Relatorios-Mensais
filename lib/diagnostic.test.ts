import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  newDiagnostic,
  diagnosticSchema,
  diagnosticReady,
  activeSections,
  suggestedDiagnosticActions,
  toggleDiagnosticProblem,
  normalizeDiagnostic,
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
    bad.sections[0].images = [
      { url: "https://other/image.png", caption: "", pointIds: [] },
    ];
    expect(diagnosticSchema.safeParse(bad).success).toBe(false);
  });
  it("prioriza áreas críticas e preserva recomendação manual", () => {
    const d = draft();
    d.sections[0] = toggleDiagnosticProblem(
      d.sections[0],
      "Capa da loja pouco atrativa",
      true,
    );
    d.sections[1] = toggleDiagnosticProblem(
      d.sections[1],
      "Produtos sem preço ou com preço zerado",
      true,
    );
    d.sections[1].points[0].action = "Recomendação conferida";
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
      {
        url: "/api/diagnostic-uploads?id=" + crypto.randomUUID(),
        caption: "",
        pointIds: [],
      },
    ];
    expect((await POST(request(d))).status).toBe(400);
  });
});

it("desmarcar um ponto preserva os outros registros", () => {
  const d = draft();
  const a = toggleDiagnosticProblem(
    d.sections[0],
    "Capa da loja pouco atrativa",
    true,
  );
  const b = toggleDiagnosticProblem(a, "Descrição da loja incompleta", true);
  b.points[1].action = "Orientação preservada";
  const c = toggleDiagnosticProblem(b, "Capa da loja pouco atrativa", false);
  expect(c.points[0].action).toBe("Orientação preservada");
  expect(
    toggleDiagnosticProblem(c, "Descrição da loja incompleta", false).status,
  ).toBe("pending");
});
it("normaliza os dez registros antigos, preservando textos, ações e prints", () => {
  const d = draft();
  const old = {
    ...d,
    schemaVersion: undefined,
    summary: "Síntese antiga",
    sections: d.sections
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        status: "pending",
        checks: [],
        notes: "",
        recommendation: "",
        images: [],
      })),
    actions: [
      {
        title: "Ação antiga",
        description: "Não substituir este texto",
        owner: "Gestor",
        deadline: "Prazo combinado",
        priority: "high",
      },
    ],
  };
  Object.assign(old.sections[0], {
    status: "good",
    checks: ["Capa da loja pouco atrativa"],
    notes: "Minha evidência",
    recommendation: "Minha orientação",
    images: [
      {
        url: "/api/diagnostic-uploads?id=" + crypto.randomUUID(),
        caption: "Print anterior",
      },
    ],
  });
  const v = normalizeDiagnostic(old);
  expect(v.schemaVersion).toBe(2);
  expect(v.sections).toHaveLength(13);
  expect(v.sections[0].status).toBe("attention");
  expect(v.sections[0].points.map((p) => p.evidence)).toContain(
    "Minha evidência",
  );
  expect(v.sections[0].points.map((p) => p.action)).toContain(
    "Minha orientação",
  );
  expect(v.actions[0].description).toBe("Não substituir este texto");
  expect(v.actions[0].deadline).toBe("Prazo combinado");
  expect(v.sections[0].images[0].caption).toBe("Print anterior");
  expect(v.reviewed).toBe(false);
  expect(normalizeDiagnostic(v)).toEqual(v);
});
