"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getMapLabel } from "@/lib/labels";

export type MinimapPoint = {
  x: number | null;
  y: number | null;
};

export type MinimapCoordinates = {
  standing: MinimapPoint;
  landing: MinimapPoint;
};

type ActivePoint = keyof MinimapCoordinates;

type MinimapCoordinatePickerProps = {
  map: string;
  value: MinimapCoordinates;
  onChange: (value: MinimapCoordinates) => void;
  className?: string;
};

const MAP_ASSET_BASE = "/assets/valorant/maps";
const KEYBOARD_STEP = 0.005; // 0.5% 归一化距离 = 微调步长
const ARROW_HEAD_SIZE = 0.025;

type MapBox = {
  // 图片相对容器的归一化盒子（0-1）。当图片 aspectRatio 与容器不匹配时，
  // object-contain 会留 letterbox，mapBox 用来描述图片实际可见区域。
  left: number;
  top: number;
  width: number;
  height: number;
} | null;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hasPoint(point: MinimapPoint) {
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}

function formatPoint(point: MinimapPoint) {
  return hasPoint(point)
    ? `${(point.x ?? 0).toFixed(3)}, ${(point.y ?? 0).toFixed(3)}`
    : "未标注";
}

// 「地图归一化坐标」→ 容器内 CSS 百分比位置
// 关键修复：mapBox 本身就是归一化值，不要再减 containerRect.left（绝对像素）。
function minimapToContainerStyle(point: MinimapPoint, mapBox: MapBox): CSSProperties {
  if (!hasPoint(point) || !mapBox || mapBox.width <= 0 || mapBox.height <= 0) {
    return { display: "none" };
  }
  const left = (mapBox.left + clamp01(point.x ?? 0) * mapBox.width) * 100;
  const top = (mapBox.top + clamp01(point.y ?? 0) * mapBox.height) * 100;
  return { left: `${left}%`, top: `${top}%` };
}

// 鼠标/触摸事件 client 坐标 → 「地图归一化坐标」
function pointFromClient(
  clientX: number,
  clientY: number,
  mapRect: DOMRect | null,
  containerRect: DOMRect | null,
): MinimapPoint {
  // 优先用图片实际渲染区域（处理 letterbox）；如果图片还没加载或不可用，回退到容器
  const target =
    mapRect && mapRect.width > 0 && mapRect.height > 0
      ? mapRect
      : containerRect;
  if (!target || target.width <= 0 || target.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp01((clientX - target.left) / target.width),
    y: clamp01((clientY - target.top) / target.height),
  };
}

// 「地图归一化坐标」→ SVG 0-1 viewBox 坐标（叠加 mapBox 偏移）
function toViewBox(point: MinimapPoint, mapBox: MapBox): { x: number; y: number } | null {
  if (!hasPoint(point) || !mapBox) return null;
  return {
    x: mapBox.left + clamp01(point.x ?? 0) * mapBox.width,
    y: mapBox.top + clamp01(point.y ?? 0) * mapBox.height,
  };
}

function ArrowHead({
  fromX,
  fromY,
  toX,
  toY,
  size,
  color,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  color: string;
}) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return null;
  const angle = Math.atan2(dy, dx);
  const half = Math.PI / 6;
  const ax = toX - size * Math.cos(angle - half);
  const ay = toY - size * Math.sin(angle - half);
  const bx = toX - size * Math.cos(angle + half);
  const by = toY - size * Math.sin(angle + half);
  return <polygon points={`${toX},${toY} ${ax},${ay} ${bx},${by}`} fill={color} />;
}

export function MinimapCoordinatePicker({
  map,
  value,
  onChange,
  className = "",
}: MinimapCoordinatePickerProps) {
  const [activePoint, setActivePoint] = useState<ActivePoint>("standing");
  const mapRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapBox, setMapBox] = useState<MapBox>(null);
  const mapSrc = `${MAP_ASSET_BASE}/${map}.png`;
  const hasStanding = hasPoint(value.standing);
  const hasLanding = hasPoint(value.landing);

  const updateRects = useCallback(() => {
    const img = mapRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    if (cRect.width === 0 || cRect.height === 0) return;
    setMapBox({
      left: (iRect.left - cRect.left) / cRect.width,
      top: (iRect.top - cRect.top) / cRect.height,
      width: iRect.width / cRect.width,
      height: iRect.height / cRect.height,
    });
  }, []);

  useEffect(() => {
    updateRects();
    if (typeof ResizeObserver === "undefined" || !containerRef.current) {
      window.addEventListener("resize", updateRects);
      return () => window.removeEventListener("resize", updateRects);
    }
    const ro = new ResizeObserver(updateRects);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [map, updateRects]);

  function writePoint(point: ActivePoint, next: MinimapPoint, advance = false) {
    onChange({ ...value, [point]: next });
    // 第一次点完站位后，自动切到落点（提升效率）
    if (advance && point === "standing" && hasPoint(next) && !hasLanding) {
      setActivePoint("landing");
    }
  }

  function pickFromClient(clientX: number, clientY: number): MinimapPoint {
    const mapRect = mapRef.current?.getBoundingClientRect() ?? null;
    const cRect = containerRef.current?.getBoundingClientRect() ?? null;
    return pointFromClient(clientX, clientY, mapRect, cRect);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // 仅左键 / 触摸 / 笔
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    writePoint(activePoint, pickFromClient(event.clientX, event.clientY), true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    writePoint(activePoint, pickFromClient(event.clientX, event.clientY));
  }

  function clearPoint(point: ActivePoint) {
    onChange({ ...value, [point]: { x: null, y: null } });
    setActivePoint(point);
  }

  // 拖拽 marker 微调：marker 上的 pointer 事件 stopPropagation，不触发容器 click
  function handleMarkerPointerDown(
    point: ActivePoint,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    event.stopPropagation();
    setActivePoint(point);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleMarkerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    writePoint(activePoint, pickFromClient(event.clientX, event.clientY));
  }

  function handleMarkerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // 已经被释放或元素已卸载，忽略
    }
  }

  // 键盘微调：方向键移动当前 activePoint
  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const current = value[activePoint];
    if (event.key === "Tab") {
      event.preventDefault();
      setActivePoint((prev) => (prev === "standing" ? "landing" : "standing"));
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      if (hasPoint(current)) {
        event.preventDefault();
        clearPoint(activePoint);
      }
      return;
    }
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -KEYBOARD_STEP;
    else if (event.key === "ArrowRight") dx = KEYBOARD_STEP;
    else if (event.key === "ArrowUp") dy = -KEYBOARD_STEP;
    else if (event.key === "ArrowDown") dy = KEYBOARD_STEP;
    else return;
    if (!hasPoint(current)) return;
    event.preventDefault();
    onChange({
      ...value,
      [activePoint]: {
        x: clamp01((current.x ?? 0) + dx),
        y: clamp01((current.y ?? 0) + dy),
      },
    });
  }

  // 引导文案：跟随标注进度变化
  const hint = !hasStanding
    ? "在地图上点一下选站位。"
    : !hasLanding
    ? "再点一下地图选落点。"
    : "直接拖动 marker 微调，或方向键 ±0.5%。";

  // SVG 标注点（用于 fallback / hover 区域命中）
  const standingVB = toViewBox(value.standing, mapBox);
  const landingVB = toViewBox(value.landing, mapBox);

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-valorant-red">
            小地图标注
          </p>
          <h3 className="mt-1 text-lg font-bold text-valorant-text">{getMapLabel(map)}</h3>
          <p className="mt-1 text-xs leading-5 text-valorant-muted">{hint}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {(["standing", "landing"] as const).map((item) => {
            const selected = activePoint === item;
            const hasIt = hasPoint(value[item]);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => setActivePoint(item)}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  selected
                    ? "border-valorant-red bg-valorant-red text-white shadow-neon"
                    : "border-white/10 text-valorant-muted hover:border-valorant-red hover:text-valorant-text"
                }`}
              >
                <span>{item === "standing" ? "标站位" : "标落点"}</span>
                {hasIt ? (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      selected ? "bg-white" : "bg-current"
                    } opacity-80`}
                    aria-label="已标注"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        role="application"
        tabIndex={0}
        aria-label={`${getMapLabel(map)} 小地图坐标选择器`}
        className="group relative aspect-square touch-none overflow-hidden rounded-2xl border border-white/10 bg-[#0F1923] shadow-inner shadow-black/50 outline-none focus-visible:ring-2 focus-visible:ring-valorant-red"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,210,255,0.08),transparent_58%)]" />
        <img
          ref={mapRef}
          src={mapSrc}
          alt={`${getMapLabel(map)} 小地图`}
          className="absolute inset-0 h-full w-full select-none object-contain p-3 opacity-80"
          draggable={false}
          onLoad={updateRects}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(236,232,225,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,225,0.06)_1px,transparent_1px)] bg-[size:10%_10%]" />

        {/* 站位→落点 连线 + 箭头 */}
        {standingVB && landingVB ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1={standingVB.x}
              y1={standingVB.y}
              x2={landingVB.x}
              y2={landingVB.y}
              stroke="#FF4655"
              strokeWidth={0.006}
              strokeDasharray="0.022 0.014"
              strokeLinecap="round"
            />
            <ArrowHead
              fromX={standingVB.x}
              fromY={standingVB.y}
              toX={landingVB.x}
              toY={landingVB.y}
              size={ARROW_HEAD_SIZE}
              color="#FF4655"
            />
          </svg>
        ) : null}

        {/* 站位 marker */}
        {hasStanding ? (
          <div
            role="button"
            aria-label="拖动调整站位"
            tabIndex={-1}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
            style={minimapToContainerStyle(value.standing, mapBox)}
            onPointerDown={(e) => handleMarkerPointerDown("standing", e)}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
            onPointerCancel={handleMarkerPointerUp}
          >
            <div
              className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-valorant-blue/20 ring-2 ring-valorant-blue transition ${
                activePoint === "standing" ? "scale-110 shadow-neon" : "group-hover:scale-105"
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-valorant-blue ring-2 ring-white" />
              <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold text-valorant-blue">
                站位
              </span>
            </div>
          </div>
        ) : null}

        {/* 落点 marker */}
        {hasLanding ? (
          <div
            role="button"
            aria-label="拖动调整落点"
            tabIndex={-1}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
            style={minimapToContainerStyle(value.landing, mapBox)}
            onPointerDown={(e) => handleMarkerPointerDown("landing", e)}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
            onPointerCancel={handleMarkerPointerUp}
          >
            <div
              className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-valorant-red/20 ring-2 ring-valorant-red transition ${
                activePoint === "landing" ? "scale-110 shadow-neon" : "group-hover:scale-105"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full bg-valorant-red ring-2 ring-white" />
              <span className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold text-valorant-red">
                落点
              </span>
            </div>
          </div>
        ) : null}

        {/* active 提示：中心十字（仅在未标任何点时显示） */}
        {!hasStanding && !hasLanding ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-6 w-6 items-center justify-center">
              <div className="absolute h-6 w-px bg-valorant-red/60" />
              <div className="absolute h-px w-6 bg-valorant-red/60" />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-xs text-valorant-muted sm:grid-cols-2">
        <CoordCard
          label="站位"
          colorClass="text-valorant-blue"
          point={value.standing}
          onClear={hasStanding ? () => clearPoint("standing") : undefined}
        />
        <CoordCard
          label="落点"
          colorClass="text-valorant-red"
          point={value.landing}
          onClear={hasLanding ? () => clearPoint("landing") : undefined}
        />
      </div>
    </div>
  );
}

function CoordCard({
  label,
  colorClass,
  point,
  onClear,
}: {
  label: string;
  colorClass: string;
  point: MinimapPoint;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-bold ${colorClass}`}>{label}</span>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer text-white/50 hover:text-valorant-red"
          >
            清除
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-mono">{formatPoint(point)}</p>
    </div>
  );
}
