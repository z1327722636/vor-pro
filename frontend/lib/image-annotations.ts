export type ImageAnnotationKind = "arrow" | "box";

export type ImageAnnotation = {
  id: string;
  type: ImageAnnotationKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  strokeWidth?: number;
  arrowSize?: number;
};

const DEFAULT_COLOR = "#FF4655";
const DEFAULT_STROKE_SCALE = 1;
const DEFAULT_ARROW_SIZE_SCALE = 1;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function normalizeAnnotation(annotation: ImageAnnotation): ImageAnnotation {
  return {
    ...annotation,
    x1: clamp01(annotation.x1),
    y1: clamp01(annotation.y1),
    x2: clamp01(annotation.x2),
    y2: clamp01(annotation.y2)
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

function drawArrow(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  headLength: number,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();

  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  context.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

function drawBox(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const boxWidth = Math.abs(x2 - x1);
  const boxHeight = Math.abs(y2 - y1);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.globalAlpha = 0.08;
  context.fillRect(left, top, boxWidth, boxHeight);
  context.globalAlpha = 1;
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.restore();
}

function splitTextIntoLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return [];

  const lines: string[] = [];
  let current = "";
  for (const char of normalized) {
    const next = `${current}${char}`;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char.trimStart();
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function drawNote(context: CanvasRenderingContext2D, note: string, canvasWidth: number, canvasHeight: number) {
  const text = note.trim();
  if (!text) return;

  const fontSize = Math.max(22, Math.round(canvasWidth * 0.028));
  const padding = Math.round(fontSize * 0.65);
  const lineHeight = Math.round(fontSize * 1.45);
  const maxWidth = Math.min(canvasWidth * 0.84, 860);
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const lines = splitTextIntoLines(context, text, maxWidth - padding * 2);
  if (lines.length === 0) return;

  const boxWidth = Math.min(maxWidth, Math.max(...lines.map((line) => context.measureText(line).width)) + padding * 2);
  const boxHeight = lines.length * lineHeight + padding * 2;
  const x = Math.round(canvasWidth * 0.035);
  const y = Math.round(canvasHeight - boxHeight - canvasHeight * 0.04);

  context.save();
  context.fillStyle = "rgba(10, 14, 19, 0.82)";
  context.strokeStyle = "rgba(255, 70, 85, 0.86)";
  context.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
  context.beginPath();
  context.roundRect(x, y, boxWidth, boxHeight, Math.round(fontSize * 0.55));
  context.fill();
  context.stroke();

  context.fillStyle = "#ECE8E1";
  lines.forEach((line, index) => {
    context.fillText(line, x + padding, y + padding + fontSize + index * lineHeight);
  });
  context.restore();
}

export async function renderAnnotatedImageFile(params: {
  sourceUrl: string;
  fileName: string;
  note?: string;
  annotations?: ImageAnnotation[];
}): Promise<File> {
  const image = await loadImage(params.sourceUrl);
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建图片编辑画布");

  context.drawImage(image, 0, 0, width, height);
  const baseStrokeWidth = Math.max(3, Math.round(Math.min(width, height) * 0.005));
  for (const raw of params.annotations ?? []) {
    const annotation = normalizeAnnotation(raw);
    const color = annotation.color ?? DEFAULT_COLOR;
    const strokeScale = annotation.strokeWidth ?? DEFAULT_STROKE_SCALE;
    const arrowSizeScale = annotation.arrowSize ?? DEFAULT_ARROW_SIZE_SCALE;
    const strokeWidth = baseStrokeWidth * strokeScale;
    const arrowHeadLength = Math.max(10, baseStrokeWidth * (3.2 + strokeScale * 0.55) * arrowSizeScale);
    const x1 = annotation.x1 * width;
    const y1 = annotation.y1 * height;
    const x2 = annotation.x2 * width;
    const y2 = annotation.y2 * height;
    if (annotation.type === "arrow") drawArrow(context, x1, y1, x2, y2, color, strokeWidth, arrowHeadLength);
    else drawBox(context, x1, y1, x2, y2, color, strokeWidth);
  }
  drawNote(context, params.note ?? "", width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("导出编辑后的图片失败"));
    }, "image/jpeg", 0.9);
  });

  const baseName = params.fileName.replace(/\.[^.]+$/, "") || "lineup-step";
  return new File([blob], `${baseName}-annotated.jpg`, { type: "image/jpeg" });
}
