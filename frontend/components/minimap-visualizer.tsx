import { getMapLabel } from "@/lib/labels";

type NormalizedPoint = {
  x?: number | null;
  y?: number | null;
};

type MinimapVisualizerProps = {
  map: string;
  site?: string | null;
  standing: NormalizedPoint;
  landing: NormalizedPoint;
  className?: string;
  compact?: boolean;
};

const MAP_ASSET_BASE = "/assets/valorant/maps";

function isValidPoint(point: NormalizedPoint) {
  return typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pointStyle(point: NormalizedPoint) {
  if (!isValidPoint(point)) return { display: "none" };
  return {
    left: `${clamp01(point.x ?? 0) * 100}%`,
    top: `${clamp01(point.y ?? 0) * 100}%`
  };
}

export function MinimapVisualizer({ map, site, standing, landing, className = "", compact = false }: MinimapVisualizerProps) {
  const hasStanding = isValidPoint(standing);
  const hasLanding = isValidPoint(landing);
  const mapSrc = `${MAP_ASSET_BASE}/${map}.png`;
  const hasAnyPoint = hasStanding || hasLanding;

  if (!hasAnyPoint) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-black/25 ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-white/10 ${compact ? "px-4 py-2.5" : "px-4 py-3"}`}>
        <div>
          <p className={`font-bold uppercase tracking-[0.22em] text-valorant-red ${compact ? "text-[10px]" : "text-xs"}`}>Minimap</p>
          <h3 className={`mt-0.5 font-bold text-valorant-text ${compact ? "text-sm" : "text-lg"}`}>
            {getMapLabel(map)}{site ? ` · ${site.toUpperCase()} 点` : ""}
          </h3>
        </div>
        <div className={`flex flex-wrap gap-2 font-semibold text-valorant-muted ${compact ? "text-[10px]" : "text-[11px]"}`}>
          <span className="rounded-full border border-valorant-blue/40 bg-valorant-blue/10 px-2.5 py-1 text-valorant-blue">站位</span>
          <span className="rounded-full border border-valorant-red/40 bg-valorant-red/10 px-2.5 py-1 text-valorant-red">落点</span>
        </div>
      </div>

      <div className={compact ? "p-2.5" : "p-3 sm:p-4"}>
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#0F1923]" role="img" aria-label="小地图站位和落点可视化">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,210,255,0.08),transparent_58%)]" />
          <img src={mapSrc} alt={`${getMapLabel(map)} 小地图`} className="absolute inset-0 h-full w-full object-contain p-3 opacity-80" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(236,232,225,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,225,0.06)_1px,transparent_1px)] bg-[size:10%_10%]" />

          {hasStanding && hasLanding ? (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line
                x1={clamp01(standing.x ?? 0) * 100}
                y1={clamp01(standing.y ?? 0) * 100}
                x2={clamp01(landing.x ?? 0) * 100}
                y2={clamp01(landing.y ?? 0) * 100}
                stroke="#FF4655"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="3 2"
              />
            </svg>
          ) : null}

          {hasStanding ? (
            <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pointStyle(standing)}>
              <div className={`relative flex items-center justify-center rounded-full bg-valorant-blue/20 ring-2 ring-valorant-blue ${compact ? "h-6 w-6" : "h-9 w-9"}`}>
                <span className={`rounded-full bg-valorant-blue ring-2 ring-white ${compact ? "h-2 w-2" : "h-3 w-3"}`} />
                <span className={`absolute -top-6 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 font-bold text-valorant-blue ${compact ? "text-[9px] -top-5" : "text-[10px] -top-7"}`}>站位</span>
              </div>
            </div>
          ) : null}

          {hasLanding ? (
            <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pointStyle(landing)}>
              <div className={`relative flex items-center justify-center rounded-full bg-valorant-red/20 ring-2 ring-valorant-red ${compact ? "h-6 w-6" : "h-10 w-10"}`}>
                <span className={`rounded-full bg-valorant-red ring-2 ring-white ${compact ? "h-2 w-2" : "h-3.5 w-3.5"}`} />
                <span className={`absolute -bottom-6 whitespace-nowrap rounded-full bg-black/75 px-2 py-0.5 font-bold text-valorant-red ${compact ? "text-[9px] -bottom-5" : "text-[10px] -bottom-7"}`}>落点</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`mt-2.5 grid gap-2 text-valorant-muted sm:grid-cols-2 ${compact ? "text-[11px]" : "text-xs"}`}>
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            站位坐标：{hasStanding ? `${standing.x?.toFixed(2)}, ${standing.y?.toFixed(2)}` : "未录入"}
          </p>
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            落点坐标：{hasLanding ? `${landing.x?.toFixed(2)}, ${landing.y?.toFixed(2)}` : "未录入"}
          </p>
        </div>
      </div>
    </div>
  );
}
