"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import "./image-editor.css";

type Rectangle = { x: number; y: number; width: number; height: number };
type ImageState = { crop: Rectangle; masks: Rectangle[] };
type Props = {
  src: string;
  onCancel: () => void;
  onSave: (
    file: File,
    metadata: { width: number; height: number; redacted: boolean },
  ) => Promise<void>;
};
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
function intersection(a: Rectangle, b: Rectangle): Rectangle | null {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}
function paint(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  state: ImageState,
  scale: number,
) {
  const { crop } = state;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width * scale,
    crop.height * scale,
  );
  context.fillStyle = "#17131e";
  for (const mask of state.masks) {
    const visible = intersection(mask, crop);
    if (visible)
      context.fillRect(
        (visible.x - crop.x) * scale,
        (visible.y - crop.y) * scale,
        visible.width * scale,
        visible.height * scale,
      );
  }
}

/** All edits remain local until the caller receives a flattened PNG. */
export default function DiagnosticImageEditor({
  src,
  onCancel,
  onSave,
}: Props) {
  const labelId = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<ImageState | null>(null);
  const [history, setHistory] = useState<ImageState[]>([]);
  const [selection, setSelection] = useState<Rectangle | null>(null);
  const [mode, setMode] = useState<"mask" | "crop">("mask");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Carregando imagem…");

  useEffect(() => {
    let cancelled = false;
    image.current = null;
    setState(null);
    setHistory([]);
    setSelection(null);
    setError("");
    setStatus("Carregando imagem…");
    const source = new Image();
    source.src = src;
    void source
      .decode()
      .then(() => {
        if (cancelled) return;
        if (
          !source.naturalWidth ||
          !source.naturalHeight ||
          source.naturalWidth > 30000 ||
          source.naturalHeight > 30000 ||
          source.naturalWidth * source.naturalHeight > 48_000_000
        )
          throw new Error(
            "Imagem grande demais para edição no navegador. Envie um recorte com até 48 milhões de pixels e 30.000 pixels por lado.",
          );
        image.current = source;
        setState({
          crop: {
            x: 0,
            y: 0,
            width: source.naturalWidth,
            height: source.naturalHeight,
          },
          masks: [],
        });
        setStatus(
          "Imagem pronta. Selecione uma região para recortar ou ocultar.",
        );
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível abrir a imagem.",
          );
          setStatus("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const host = canvas.current;
    if (!host || !state || !image.current) return;
    // Preview is bounded; the exported PNG retains every pixel in the crop.
    const scale = Math.min(
      1,
      1800 / Math.max(state.crop.width, state.crop.height),
    );
    host.width = Math.max(1, Math.round(state.crop.width * scale));
    host.height = Math.max(1, Math.round(state.crop.height * scale));
    const context = host.getContext("2d");
    if (!context) return;
    paint(context, image.current, state, scale);
    if (selection) {
      const x = selection.x * scale,
        y = selection.y * scale;
      const width = selection.width * scale,
        height = selection.height * scale;
      context.fillStyle =
        mode === "mask" ? "rgba(23,19,30,.7)" : "rgba(130,10,209,.15)";
      context.fillRect(x, y, width, height);
      context.strokeStyle = "#820ad1";
      context.lineWidth = 3;
      context.setLineDash([8, 5]);
      context.strokeRect(x + 1, y + 1, width - 2, height - 2);
    }
  }, [state, selection, mode]);

  function coordinates(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const crop = state!.crop;
    return {
      x: clamp(
        Math.round(((event.clientX - bounds.left) / bounds.width) * crop.width),
        0,
        crop.width,
      ),
      y: clamp(
        Math.round(
          ((event.clientY - bounds.top) / bounds.height) * crop.height,
        ),
        0,
        crop.height,
      ),
    };
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!start.current || !state || busy) return;
    const end = coordinates(event),
      origin = start.current;
    setSelection({
      x: Math.min(origin.x, end.x),
      y: Math.min(origin.y, end.y),
      width: Math.abs(end.x - origin.x),
      height: Math.abs(end.y - origin.y),
    });
  }
  function commit(next: ImageState, message: string) {
    if (!state) return;
    setHistory((items) => [...items, state]);
    setState(next);
    setSelection(null);
    setStatus(message);
    setError("");
  }
  function apply() {
    if (!state || !selection || selection.width < 2 || selection.height < 2)
      return;
    const absolute = {
      ...selection,
      x: state.crop.x + selection.x,
      y: state.crop.y + selection.y,
    };
    if (mode === "crop")
      commit(
        { ...state, crop: absolute },
        "Recorte aplicado. As tarjas existentes foram mantidas.",
      );
    else
      commit(
        { ...state, masks: [...state.masks, absolute] },
        "Tarja aplicada. Selecione outra região ou salve o print.",
      );
  }
  function numeric(key: keyof Rectangle, value: string) {
    if (!state) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const next = {
      ...(selection || {
        x: 0,
        y: 0,
        width: Math.min(180, state.crop.width),
        height: Math.min(40, state.crop.height),
      }),
      [key]: Math.round(parsed),
    };
    next.x = clamp(next.x, 0, state.crop.width - 2);
    next.y = clamp(next.y, 0, state.crop.height - 2);
    next.width = clamp(next.width, 2, state.crop.width - next.x);
    next.height = clamp(next.height, 2, state.crop.height - next.y);
    setSelection(next);
  }
  async function save() {
    if (!state || !image.current) return;
    if (selection && selection.width >= 2 && selection.height >= 2) {
      setError(
        "Aplique ou descarte a seleção antes de salvar. Ela ainda não foi incorporada à imagem.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const output = document.createElement("canvas");
      output.width = state.crop.width;
      output.height = state.crop.height;
      const context = output.getContext("2d");
      if (!context)
        throw new Error("Não foi possível preparar o print neste navegador.");
      paint(context, image.current, state, 1);
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Não foi possível salvar a imagem editada.")),
          "image/png",
        ),
      );
      output.width = 0;
      output.height = 0;
      if (blob.size > 10 * 1024 * 1024)
        throw new Error(
          "O print editado ultrapassa 10 MB. Recorte a área relevante antes de salvar.",
        );
      await onSave(
        new File([blob], "print-diagnostico-editado.png", {
          type: "image/png",
        }),
        {
          width: state.crop.width,
          height: state.crop.height,
          redacted: state.masks.some(
            (mask) => !!intersection(mask, state.crop),
          ),
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o print.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="diag-picture-editor"
      aria-labelledby={labelId}
      aria-busy={busy}
    >
      <div className="diag-picture-heading">
        <div>
          <h4 id={labelId}>Preparar print</h4>
          <p>
            Recorte a área útil e cubra IDs, e-mails e a aba “Avalie esta
            página” com tarjas.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar edição
        </button>
      </div>
      <div
        className="diag-picture-tools"
        role="group"
        aria-label="Ferramentas de imagem"
      >
        <button
          type="button"
          className={mode === "crop" ? "" : "secondary"}
          aria-pressed={mode === "crop"}
          disabled={busy || !state}
          onClick={() => setMode("crop")}
        >
          Recortar
        </button>
        <button
          type="button"
          className={mode === "mask" ? "" : "secondary"}
          aria-pressed={mode === "mask"}
          disabled={busy || !state}
          onClick={() => setMode("mask")}
        >
          Ocultar com tarja
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || !history.length}
          onClick={() => {
            setState(history[history.length - 1]);
            setHistory(history.slice(0, -1));
            setSelection(null);
            setStatus("Última edição desfeita.");
          }}
        >
          Desfazer
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || !history.length}
          onClick={() => {
            setState(history[0]);
            setHistory([]);
            setSelection(null);
            setStatus("Imagem restaurada ao início desta edição.");
          }}
        >
          Restaurar
        </button>
      </div>
      {state && (
        <>
          <p className="diag-picture-instructions">
            Arraste sobre o print para selecionar. Depois clique em{" "}
            <strong>
              {mode === "crop" ? "Aplicar recorte" : "Aplicar tarja"}
            </strong>
            . Também é possível informar as coordenadas abaixo.
          </p>
          <div className="diag-picture-canvas">
            <canvas
              ref={canvas}
              role="img"
              aria-label="Prévia do print com recortes e tarjas aplicados"
              onPointerDown={(event) => {
                if (busy || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                start.current = coordinates(event);
                setSelection(null);
              }}
              onPointerMove={move}
              onPointerUp={(event) => {
                move(event);
                start.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                start.current = null;
                setSelection(null);
              }}
            />
          </div>
          <div className="diag-picture-selection">
            {(
              [
                ["x", "Esquerda"],
                ["y", "Topo"],
                ["width", "Largura"],
                ["height", "Altura"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label} (px)
                <input
                  type="number"
                  min={key === "x" || key === "y" ? 0 : 2}
                  step="1"
                  disabled={busy}
                  value={selection?.[key] ?? ""}
                  onChange={(event) => numeric(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="diag-picture-tools">
            <button
              type="button"
              disabled={
                busy ||
                !selection ||
                selection.width < 2 ||
                selection.height < 2
              }
              onClick={apply}
            >
              {mode === "crop" ? "Aplicar recorte" : "Aplicar tarja"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !selection}
              onClick={() => {
                setSelection(null);
                setError("");
              }}
            >
              Descartar seleção
            </button>
            <span>
              {state.crop.width.toLocaleString("pt-BR")} ×{" "}
              {state.crop.height.toLocaleString("pt-BR")} px ·{" "}
              {
                state.masks.filter((mask) => intersection(mask, state.crop))
                  .length
              }{" "}
              tarja(s)
            </span>
          </div>
        </>
      )}
      <p role="status" className="diag-picture-status">
        {status}
      </p>
      {error && (
        <p role="alert" className="diag-picture-error">
          {error}
        </p>
      )}
      <div className="diag-picture-save">
        <p>
          Ao salvar, apenas a imagem editada é enviada. As tarjas ficam
          incorporadas aos pixels, sem uma camada que possa ser removida do
          print.
        </p>
        <button
          type="button"
          disabled={busy || !state}
          onClick={() => void save()}
        >
          {busy ? "Salvando print…" : "Salvar print editado"}
        </button>
      </div>
    </section>
  );
}
