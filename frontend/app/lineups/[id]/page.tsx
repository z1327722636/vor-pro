import Link from "next/link";
import { LikeReportBar } from "@/components/like-report-bar";
import { MinimapVisualizer } from "@/components/minimap-visualizer";
import { SourceBadge } from "@/components/source-badge";
import { TripletViewer } from "@/components/triplet-viewer";
import { apiFetch, type Lineup, type LineupStep } from "@/lib/api";
import { getAbilityLabel, getAgentLabel, getMapLabel, getSideLabel, getSiteLabel, getThrowLabel } from "@/lib/labels";

function getLineupSteps(lineup: Lineup): LineupStep[] {
  if (lineup.steps?.length) return lineup.steps;
  return [
    { title: "站位", image_path: lineup.standing_image_path, note: lineup.standing_description, order_index: 0 },
    { title: "瞄准", image_path: lineup.aim_image_path, note: lineup.aim_description, order_index: 1 },
    { title: "落点", image_path: lineup.landing_image_path, note: lineup.landing_description, order_index: 2 }
  ].filter((item) => item.image_path || item.note);
}

export default async function LineupDetailPage({ params }: { params: { id: string } }) {
  const lineup = await apiFetch<Lineup>(`/api/lineups/${params.id}`);
  const steps = getLineupSteps(lineup);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm tracking-[0.3em] text-valorant-red">点位详情</p>
            <h1 className="text-2xl font-extrabold text-valorant-text sm:text-4xl">{getMapLabel(lineup.map)} · {getAgentLabel(lineup.agent)}</h1>
          </div>
          <SourceBadge source={lineup.source_type} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-valorant-muted">
          <span>{getSideLabel(lineup.side)}</span>
          <span>{getSiteLabel(lineup.site ?? "a")}</span>
          <span>{getAbilityLabel(lineup.ability)}</span>
          <span>{getThrowLabel(lineup.throw_type)}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {lineup.original_video_url && (
            <a href={lineup.original_video_url} target="_blank" rel="noreferrer" className="w-fit rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-valorant-text transition hover:border-valorant-red hover:text-valorant-red">
              跳回原视频
            </a>
          )}
          {lineup.source_type === "ai_auto" && (
            <Link href={`/contribute/upload?tab=video&correctFromLineupId=${lineup.id}`} className="w-fit rounded-xl border border-valorant-blue/40 px-5 py-3 text-sm font-bold text-valorant-blue transition hover:shadow-blueNeon">
              修正关键帧
            </Link>
          )}
        </div>
      </section>
      <TripletViewer steps={steps} />
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MinimapVisualizer
          map={lineup.map}
          site={lineup.site}
          standing={{ x: lineup.minimap_x, y: lineup.minimap_y }}
          landing={{ x: lineup.landing_x, y: lineup.landing_y }}
        />
        <div className="rounded-2xl border border-white/10 bg-valorant-panel p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-valorant-text">社区反馈</h2>
          <LikeReportBar likes={lineup.likes_count} />
        </div>
      </section>
    </div>
  );
}
