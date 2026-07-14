"use client";

import { MousePointer2, Square, Trash2, Undo2 } from "lucide-react";
import { useId, useState, type PointerEvent as ReactPointerEvent } from "react";
import { type ImageAnnotation, type ImageAnnotationKind, normalizeAnnotation } from "@/lib/image-annotations";

type ImageAnnotationEditorProps = {
  imageUrl?: string;
  annotations: ImageAnnotation[];
  onChange: (annotations: ImageAnnotation[]) => void;
  className?: string;
};

const TOOL_LABELS: Record<ImageAnnotationKind, string> = {
  arrow: "箭头",
  box: "画框"
};

const COLORS = ["#FF4655", "#94d2ff", "#FACC15", "#34D399"];
const STROKE_OPTIONS = [
  { value: 0.7, label: "细" },
  { value: 1, label: "中" },
  { value: 1.25, label: "粗" },
  { value: 1.5, label: "加粗" }
];
const ARROW_SIZE_OPTIONS = [
  { value: 0.75, label: "小" },
  { value: 1, label: "中" },
  { value: 1.18, label: "大" },
  { value: 1.35, label: "加大" }
];

function createAnnotation(type: ImageAnnotationKind, x: number, y: number, color: string, strokeWidth: number, arrowSize: number): ImageAnnotation {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, type, x1: x, y1: y, x2: x, y2: y, color, strokeWidth, arrowSize };
}

function pointFromEvent(event: ReactPointerEvent<SVGSVGElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  };
}

function isMeaningful(annotation: ImageAnnotation) {
  const dx = Math.abs(annotation.x2 - annotation.x1);
  const dy = Math.abs(annotation.y2 - annotation.y1);
  return annotation.type === "arrow" ? Math.hypot(dx, dy) > 0.035 : dx > 0.025 && dy > 0.025;
}

function buildArrowHeadPoints(annotation: ImageAnnotation) {
  const normalized = normalizeAnnotation(annotation);
  const x1 = normalized.x1 * 100;
  const y1 = normalized.y1 * 100;
  const x2 = normalized.x2 * 100;
  const y2 = normalized.y2 * 100;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const strokeWidth = normalized.strokeWidth ?? 1;
  const headLength = (2.15 + strokeWidth * 0.42) * (normalized.arrowSize ?? 1);
  const halfAngle = Math.PI / 6;
  const leftX = x2 - headLength * Math.cos(angle - halfAngle);
  const leftY = y2 - headLength * Math.sin(angle - halfAngle);
  const rightX = x2 - headLength * Math.cos(angle + halfAngle);
  const rightY = y2 - headLength * Math.sin(angle + halfAngle);
  return `${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`;
}

function renderAnnotation(annotation: ImageAnnotation, isDraft = false) {
  const normalized = normalizeAnnotation(annotation);
  const color = normalized.color ?? "#FF4655";
  const opacity = isDraft ? 0.72 : 1;
  const strokeWidth = normalized.strokeWidth ?? 1;

  if (normalized.type === "box") {
    const x = Math.min(normalized.x1, normalized.x2) * 100;
    const y = Math.min(normalized.y1, normalized.y2) * 100;
    const width = Math.abs(normalized.x2 - normalized.x1) * 100;
    const height = Math.abs(normalized.y2 - normalized.y1) * 100;
    return (
      <rect
        key={normalized.id}
        x={`${x}%`}
        y={`${y}%`}
        width={`${width}%`}
        height={`${height}%`}
        rx="1.5%"
        fill={color}
        fillOpacity={0.06 * opacity}
        stroke={color}
        strokeWidth={0.48 * strokeWidth}
      />
    );
  }

  return (
    <g key={normalized.id} opacity={opacity}>
      <line
        x1={normalized.x1 * 100}
        y1={normalized.y1 * 100}
        x2={normalized.x2 * 100}
        y2={normalized.y2 * 100}
        stroke={color}
        strokeWidth={0.48 * strokeWidth}
        strokeLinecap="round"
      />
      <polygon points={buildArrowHeadPoints(normalized)} fill={color} />
    </g>
  );
}

export function ImageAnnotationEditor({ imageUrl, annotations, onChange, className = "" }: ImageAnnotationEditorProps) {
  const descriptionId = useId();
  const [tool, setTool] = useState<ImageAnnotationKind>("arrow");
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [arrowSize, setArrowSize] = useState(1);
  const [draft, setDraft] = useState<ImageAnnotation | null>(null);

  function startDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (!imageUrl || event.button !== 0) return;
    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft(createAnnotation(tool, point.x, point.y, color, strokeWidth, arrowSize));
  }

  function moveDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const point = pointFromEvent(event);
    setDraft({ ...draft, x2: point.x, y2: point.y });
  }

  function finishDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draft) return;
    const point = pointFromEvent(event);
    const next = normalizeAnnotation({ ...draft, x2: point.x, y2: point.y });
    setDraft(null);
    if (isMeaningful(next)) onChange([...annotations, next]);
  }

  function cancelDrawing() {
    setDraft(null);
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/25 p-3 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="mr-1 font-bold uppercase tracking-[0.18em] text-valorant-red">图片标注</span>
        {(["arrow", "box"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tool === item}
            onClick={() => setTool(item)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 font-bold transition ${tool === item ? "border-valorant-red bg-valorant-red text-white" : "border-white/10 text-valorant-muted hover:border-valorant-red hover:text-valorant-text"}`}
          >
            {item === "arrow" ? <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Square className="h-3.5 w-3.5" aria-hidden="true" />}
            {TOOL_LABELS[item]}
          </button>
        ))}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5" aria-label="标注颜色">
          {COLORS.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`使用颜色 ${item}`}
              onClick={() => setColor(item)}
              className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${color === item ? "scale-110 border-white" : "border-transparent"}`}
              style={{ backgroundColor: item }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5" aria-label="线条粗细">
          <span className="px-1 font-bold text-valorant-muted">线宽</span>
          {STROKE_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-label={`线宽${item.label}`}
              aria-pressed={strokeWidth === item.value}
              onClick={() => setStrokeWidth(item.value)}
              className={`flex h-8 min-w-10 cursor-pointer items-center justify-center rounded-md px-2 transition ${strokeWidth === item.value ? "bg-valorant-red text-white" : "text-valorant-muted hover:text-valorant-text"}`}
            >
              <span className="sr-only">{item.label}</span>
              <span className="block w-6 rounded-full bg-current" style={{ height: `${Math.max(2, item.value * 3)}px` }} />
            </button>
          ))}
        </div>
        {tool === "arrow" ? (
          <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5" aria-label="箭头大小">
            <span className="px-1 font-bold text-valorant-muted">箭头头</span>
            {ARROW_SIZE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={arrowSize === item.value}
                onClick={() => setArrowSize(item.value)}
                className={`cursor-pointer rounded-md px-2 py-1 font-bold transition ${arrowSize === item.value ? "bg-valorant-red text-white" : "text-valorant-muted hover:text-valorant-text"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <button type="button" onClick={() => onChange(annotations.slice(0, -1))} disabled={annotations.length === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 font-bold text-valorant-muted hover:border-valorant-blue hover:text-valorant-blue disabled:cursor-not-allowed disabled:opacity-40">
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          撤销
        </button>
        <button type="button" onClick={() => onChange([])} disabled={annotations.length === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 font-bold text-valorant-muted hover:border-valorant-red hover:text-valorant-red disabled:cursor-not-allowed disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          清空
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-valorant-navy touch-none">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="待标注截图" className="block aspect-video w-full object-contain bg-black" draggable={false} />
            <svg
              aria-label="在图片上拖拽绘制标注"
              aria-describedby={descriptionId}
              role="img"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full cursor-crosshair"
              onPointerDown={startDrawing}
              onPointerMove={moveDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={cancelDrawing}
              onPointerLeave={cancelDrawing}
            >
              {annotations.map((annotation) => renderAnnotation(annotation))}
              {draft ? renderAnnotation(draft, true) : null}
            </svg>
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center px-4 text-center text-sm text-valorant-muted">
            选择图片后可在这里拖拽画箭头或框选区域，备注会作为步骤描述单独保存。
          </div>
        )}
      </div>
      <p id={descriptionId} className="mt-2 text-xs leading-5 text-valorant-muted">操作：先选工具、颜色、粗细和箭头大小，再在图片上拖拽。每次绘制会记录当时的样式，提交时一起合成为最终图片。</p>
    </div>
  );
}
