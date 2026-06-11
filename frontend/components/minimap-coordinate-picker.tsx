"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hasPoint(point: MinimapPoint) {
  return typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}

function formatPoint(point: MinimapPoint) {
  return hasPoint(point) ? `${point.x?.toFixed(3)}, ${point.y?.toFixed(3)}` : "未标注";
}

function pointFromEvent(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height)
  };
}

function pointStyle(point: MinimapPoint) {
  if (!hasPoint(point)) return { display: "none" };
  return {
    left: `${(point.x ?? 0) * 100}%`,
    top: `${(point.y ?? 0) * 100}%`
  };
}

export function MinimapCoordinatePicker({ map, value, onChange, className = "" }: MinimapCoordinatePickerProps) {
  const [activePoint, setActivePoint] = useState<ActivePoint>("standing");
  const mapSrc = `${MAP_ASSET_BASE}/${map}.png`;
  const hasStanding = hasPoint(value.standing);
  const hasLanding = hasPoint(value.landing);

  function updatePoint(nextPoint: MinimapPoint, shouldSwitch = false) {
    onChange({ ...value, [activePoint]: nextPoint });
    if (shouldSwitch && activePoint === "standing") setActivePoint("landing");
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePoint(pointFromEvent(event), true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    updatePoint(pointFromEvent(event));
  }

  function clearPoint(point: ActivePoint) {
    onChange({ ...value, [point]: { x: null, y: null } });
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-valorant-red">小地图标注</p>
          <h3 className="mt-1 text-lg font-bold text-valorant-text">{getMapLabel(map)}</h3>
          <p className="mt-1 text-xs leading-5 text-valorant-muted">不用输入坐标：先选“站位”或“落点”，然后在对应地图上点击/拖拽。</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {(["standing", "landing"] as const).map((item) => {
            const selected = activePoint === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => setActivePoint(item)}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-bold transition ${selected ? "border-valorant-red bg-valorant-red text-white shadow-neon" : "border-white/10 text-valorant-muted hover:border-valorant-red hover:text-valorant-text"}`}
              >
                {item === "standing" ? "标站位" : "标落点"}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="application"
        aria-label={`${getMapLabel(map)} 小地图坐标选择器`}
        className="relative aspect-square touch-none overflow-hidden rounded-2xl border border-white/10 bg-[#0F1923] shadow-inner shadow-black/50"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,210,255,0.08),transparent_58%)]" />
        <img src={mapSrc} alt={`${getMapLabel(map)} 小地图`} className="absolute inset-0 h-full w-full object-contain p-3 opacity-80" draggable={false} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(236,232,225,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,225,0.06)_1px,transparent_1px)] bg-[size:10%_10%]" />

        {hasStanding && hasLanding ? (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line
              x1={(value.standing.x ?? 0) * 100}
              y1={(value.standing.y ?? 0) * 100}
              x2={(value.landing.x ?? 0) * 100}
              y2={(value.landing.y ?? 0) * 100}
              stroke="#FF4655"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              strokeLinecap="round"
            />
          </svg>
        ) : null}

        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={pointStyle(value.standing)}>
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-valorant-blue/20 ring-2 ring-valorant-blue">
            <span className="h-3 w-3 rounded-full bg-valorant-blue ring-2 ring-white" />
            <span className="absolute -top-7 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold text-valorant-blue">站位</span>
          </div>
        </div>

        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={pointStyle(value.landing)}>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-valorant-red/20 ring-2 ring-valorant-red">
            <span className="h-3.5 w-3.5 rounded-full bg-valorant-red ring-2 ring-white" />
            <span className="absolute -bottom-7 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold text-valorant-red">落点</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-valorant-muted sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-valorant-blue">站位</span>
            {hasStanding ? <button type="button" onClick={() => clearPoint("standing")} className="cursor-pointer text-white/50 hover:text-valorant-red">清除</button> : null}
          </div>
          <p className="mt-1 font-mono">{formatPoint(value.standing)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-valorant-red">落点</span>
            {hasLanding ? <button type="button" onClick={() => clearPoint("landing")} className="cursor-pointer text-white/50 hover:text-valorant-red">清除</button> : null}
          </div>
          <p className="mt-1 font-mono">{formatPoint(value.landing)}</p>
        </div>
      </div>
    </div>
  );
}
