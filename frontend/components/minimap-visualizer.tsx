"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getMapLabel } from "@/lib/labels";

type NormalizedPoint = {
  x?: number | null;
  y?: number | null;
};

type MapBox = {
  // 图片相对容器的归一化盒子（0-1）
  left: number;
  top: number;
  width: number;
  height: number;
} | null;

type MinimapVisualizerProps = {
  map: string;
  site?: string | null;
  standing: NormalizedPoint;
  landing: NormalizedPoint;
  className?: string;
  compact?: boolean;
};

const MAP_ASSET_BASE = "/assets/valorant/maps";
const ARROW_HEAD_SIZE = 0.025;

function isValidPoint(point: NormalizedPoint) {
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

// 「地图归一化坐标」→ 容器内 CSS 百分比位置（与 picker 一致的换算）
function minimapToContainerStyle(point: NormalizedPoint, mapBox: MapBox): CSSProperties {
  if (!isValidPoint(point) || !mapBox || mapBox.width <= 0 || mapBox.height <= 0) {
    return { display: "none" };
  }
  const left = (mapBox.left + clamp01(point.x ?? 0) * mapBox.width) * 100;
  const top = (mapBox.top + clamp01(point.y ?? 0) * mapBox.height) * 100;
  return { left: `${left}%`, top: `${top}%` };
}

// 「地图归一化坐标」→ SVG 0-1 viewBox 坐标
function toViewBox(point: NormalizedPoint, mapBox: MapBox): { x: number; y: number } | null {
  if (!isValidPoint(point) || !mapBox) return null;
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

export function MinimapVisualizer({
  map,
  site,
  standing,
  landing,
  className = "",
  compact = false,
}: MinimapVisualizerProps) {
  const mapRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapBox, setMapBox] = useState<MapBox>(null);
  const mapSrc = `${MAP_ASSET_BASE}/${map}.png`;
  const hasStanding = isValidPoint(standing);
  const hasLanding = isValidPoint(landing);
  const hasAnyPoint = hasStanding || hasLanding;

  const updateMapBox = () => {
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
  };

  useEffect(() => {
    updateMapBox();
    if (typeof ResizeObserver === "undefined" || !containerRef.current) {
      window.addEventListener("resize", updateMapBox);
      return () => window.removeEventListener("resize", updateMapBox);
    }
    const ro = new ResizeObserver(updateMapBox);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [map]);

  if (!hasAnyPoint) {
    return null;
  }

  const standingVB = toViewBox(standing, mapBox);
  const landingVB = toViewBox(landing, mapBox);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-black/25 ${className}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-white/10 ${
          compact ? "px-4 py-2.5" : "px-4 py-3"
        }`}
      >
        <div>
          <p
            className={`font-bold uppercase tracking-[0.22em] text-valorant-red ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            Minimap
          </p>
          <h3
            className={`mt-0.5 font-bold text-valorant-text ${
              compact ? "text-sm" : "text-lg"
            }`}
          >
            {getMapLabel(map)}
            {site ? ` · ${site.toUpperCase()} 点` : ""}
          </h3>
        </div>
        <div
          className={`flex flex-wrap gap-2 font-semibold text-valorant-muted ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          <span className="rounded-full border border-valorant-blue/40 bg-valorant-blue/10 px-2.5 py-1 text-valorant-blue">
            站位
          </span>
          <span className="rounded-full border border-valorant-red/40 bg-valorant-red/10 px-2.5 py-1 text-valorant-red">
            落点
          </span>
        </div>
      </div>

      <div className={compact ? "p-2.5" : "p-3 sm:p-4"}>
        <div
          ref={containerRef}
          className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#0F1923]"
          role="img"
          aria-label="小地图站位和落点可视化"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,210,255,0.08),transparent_58%)]" />
          <img
            ref={mapRef}
            src={mapSrc}
            alt={`${getMapLabel(map)} 小地图`}
            className="absolute inset-0 h-full w-full select-none object-contain p-3 opacity-80"
            draggable={false}
            onLoad={updateMapBox}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(236,232,225,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,225,0.06)_1px,transparent_1px)] bg-[size:10%_10%]" />

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

          {hasStanding ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={minimapToContainerStyle(standing, mapBox)}
            >
              <div
                className={`relative flex items-center justify-center rounded-full bg-valorant-blue/20 ring-2 ring-valorant-blue ${
                  compact ? "h-6 w-6" : "h-9 w-9"
                }`}
              >
                <span
                  className={`rounded-full bg-valorant-blue ring-2 ring-white ${
                    compact ? "h-2 w-2" : "h-3 w-3"
                  }`}
                />
                <span
                  className={`pointer-events-none absolute whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 font-bold text-valorant-blue ${
                    compact ? "text-[9px] -top-5" : "text-[10px] -top-7"
                  }`}
                >
                  站位
                </span>
              </div>
            </div>
          ) : null}

          {hasLanding ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={minimapToContainerStyle(landing, mapBox)}
            >
              <div
                className={`relative flex items-center justify-center rounded-full bg-valorant-red/20 ring-2 ring-valorant-red ${
                  compact ? "h-6 w-6" : "h-10 w-10"
                }`}
              >
                <span
                  className={`rounded-full bg-valorant-red ring-2 ring-white ${
                    compact ? "h-2 w-2" : "h-3.5 w-3.5"
                  }`}
                />
                <span
                  className={`pointer-events-none absolute whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 font-bold text-valorant-red ${
                    compact ? "text-[9px] -bottom-5" : "text-[10px] -bottom-7"
                  }`}
                >
                  落点
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
