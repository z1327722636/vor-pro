import Link from "next/link";
import { assetUrl, type Lineup, type LineupStep } from "@/lib/api";
import { getAbilityLabel, getAgentLabel, getMapLabel, getSideLabel, getSiteLabel } from "@/lib/labels";
import { SourceBadge } from "./source-badge";

function getPreviewSteps(lineup: Lineup): LineupStep[] {
  if (lineup.steps?.length) return lineup.steps;
  return [
    { title: "站位", image_path: lineup.standing_image_path, note: lineup.standing_description, order_index: 0 },
    { title: "瞄准", image_path: lineup.aim_image_path, note: lineup.aim_description, order_index: 1 },
    { title: "落点", image_path: lineup.landing_image_path, note: lineup.landing_description, order_index: 2 }
  ].filter((item) => item.image_path || item.note);
}

export function LineupCard({ lineup }: { lineup: Lineup }) {
  const steps = getPreviewSteps(lineup);
  const previewSteps = steps.slice(0, 3);
  const summary = steps.find((item) => item.note)?.note || "等待补充步骤说明";

  return (
    <Link
      href={`/lineups/${lineup.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-valorant-panel/80 shadow-black/30 transition hover:-translate-y-1 hover:border-valorant-red/70 hover:shadow-neon"
    >
      <div className="grid h-36 grid-cols-3 gap-1 bg-valorant-navy p-1">
        {previewSteps.map((step, index) => {
          const src = assetUrl(step.image_path);
          const extraCount = index === 2 && steps.length > 3 ? steps.length - 3 : 0;

          return (
            <div key={`${step.title}-${index}`} className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-valorant-panel2 to-black text-xs text-valorant-muted">
              {src ? <img src={src} alt={`${step.title}预览`} className="h-full w-full object-cover transition group-hover:scale-105" /> : step.title}
              {extraCount > 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white">+{extraCount}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold uppercase text-valorant-text">{getMapLabel(lineup.map)} · {getAgentLabel(lineup.agent)}</h3>
          <SourceBadge source={lineup.source_type} />
        </div>
        <p className="line-clamp-2 text-sm text-valorant-muted">{summary}</p>
        <div className="flex items-center justify-between text-xs text-valorant-muted">
          <span>{getSiteLabel(lineup.site ?? "a")} / {getSideLabel(lineup.side)} / {getAbilityLabel(lineup.ability)}</span>
          <span>{lineup.likes_count} 赞</span>
        </div>
      </div>
    </Link>
  );
}
