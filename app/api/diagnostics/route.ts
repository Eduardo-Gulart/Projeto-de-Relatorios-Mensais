import { access, AccessError } from "@/lib/team";
import { database, bucket, sameOrigin, fail } from "@/lib/storage";
import { diagnosticReady, normalizeDiagnostic } from "@/lib/diagnostic";
export async function GET(req: Request) {
  try {
    const a = await access(req);
    const rows = await database()
      .prepare(
        "SELECT payload,updated FROM diagnostics WHERE owner=? ORDER BY updated DESC LIMIT 500",
      )
      .bind(a.subject)
      .all<{ payload: string; updated: string }>();
    return Response.json(
      rows.results.map((r) => ({
        ...normalizeDiagnostic(JSON.parse(r.payload)),
        updated: r.updated,
      })),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const a = await access(req);
    const body = await req.text();
    if (new TextEncoder().encode(body).length > 750000)
      throw new AccessError(413, "Diagnóstico muito grande.");
    let d;
    try {
      d = normalizeDiagnostic(JSON.parse(body));
    } catch {
      throw new AccessError(
        400,
        "Confira os campos, vínculos e status do diagnóstico.",
      );
    }
    if (d.reviewed && !diagnosticReady(d))
      throw new AccessError(
        400,
        "Informe loja, responsável e ao menos uma seção avaliada.",
      );
    for (const s of d.sections)
      for (const image of s.images) {
        const id = new URL(image.url, "https://local").searchParams.get("id");
        if (
          !(await bucket().head(
            "diagnostics/" + encodeURIComponent(a.subject) + "/" + id,
          ))
        )
          throw new AccessError(
            400,
            "Um print não pertence à sua conta ou não está disponível.",
          );
      }
    const db = database(),
      row = await db
        .prepare("SELECT owner,updated FROM diagnostics WHERE id=?")
        .bind(d.id)
        .first<{ owner: string; updated: string }>();
    if (row && row.owner !== a.subject)
      throw new AccessError(404, "Diagnóstico não encontrado.");
    const expected = req.headers.get("X-Diagnostic-Version") || "";
    if ((row && row.updated !== expected) || (!row && expected))
      throw new AccessError(
        409,
        "O diagnóstico mudou em outra aba. Reabra a versão salva ou salve uma cópia.",
      );
    const updated = new Date(
      Math.max(Date.now(), row ? Date.parse(row.updated) + 1 : 0),
    ).toISOString();
    const result = row
      ? await db
          .prepare(
            "UPDATE diagnostics SET payload=?,updated=? WHERE id=? AND owner=? AND updated=?",
          )
          .bind(JSON.stringify(d), updated, d.id, a.subject, expected)
          .run()
      : await db
          .prepare(
            "INSERT INTO diagnostics(id,owner,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
          )
          .bind(d.id, a.subject, JSON.stringify(d), updated)
          .run();
    if (!result.meta.changes)
      throw new AccessError(
        409,
        "Outra aba alterou o diagnóstico. Reabra a versão salva.",
      );
    return Response.json({ updated });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const a = await access(req),
      id = new URL(req.url).searchParams.get("id"),
      version = req.headers.get("X-Diagnostic-Version");
    if (!id || !version)
      throw new AccessError(400, "Selecione um diagnóstico salvo.");
    const result = await database()
      .prepare("DELETE FROM diagnostics WHERE id=? AND owner=? AND updated=?")
      .bind(id, a.subject, version)
      .run();
    if (!result.meta.changes)
      throw new AccessError(
        409,
        "Não foi possível excluir esta versão. Atualize a lista.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
