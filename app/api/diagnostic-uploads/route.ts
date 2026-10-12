import { access, AccessError } from "@/lib/team";
import { bucket, sameOrigin, fail } from "@/lib/storage";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const a = await access(req);
    if (Number(req.headers.get("content-length")) > 11000000)
      throw new AccessError(413, "Envie uma imagem de até 10 MB.");
    const form = await req.formData(),
      file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 10485760 ||
      !["image/png", "image/jpeg"].includes(file.type)
    )
      throw new AccessError(400, "Use PNG ou JPG de até 10 MB.");
    const data = await file.arrayBuffer(),
      h = new Uint8Array(data),
      png = h[0] === 137 && h[1] === 80 && h[2] === 78 && h[3] === 71,
      jpg = h[0] === 255 && h[1] === 216 && h[2] === 255;
    if (!png && !jpg) throw new AccessError(400, "Imagem inválida.");
    const id = crypto.randomUUID();
    await bucket().put(
      "diagnostics/" + encodeURIComponent(a.subject) + "/" + id,
      data,
      { httpMetadata: { contentType: png ? "image/png" : "image/jpeg" } },
    );
    return Response.json({ url: "/api/diagnostic-uploads?id=" + id });
  } catch (e) {
    return fail(e);
  }
}
export async function GET(req: Request) {
  try {
    const a = await access(req),
      id = new URL(req.url).searchParams.get("id");
    if (!id || !/^[a-zA-Z0-9-]{36}$/.test(id))
      throw new AccessError(404, "Print não encontrado.");
    const object = await bucket().get(
      "diagnostics/" + encodeURIComponent(a.subject) + "/" + id,
    );
    if (!object) throw new AccessError(404, "Print não encontrado.");
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
