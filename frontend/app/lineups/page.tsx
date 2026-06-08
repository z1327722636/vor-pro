import FilterBar from "@/components/filter-bar";
import { LineupCard } from "@/components/lineup-card";
import { apiFetch, type Lineup } from "@/lib/api";

type LineupsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const filterKeys = ["q", "map", "site", "side", "agent", "ability", "throw_type", "source_type", "sort"] as const;

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildLineupsPath(searchParams: LineupsPageProps["searchParams"]) {
  const params = new URLSearchParams();
  filterKeys.forEach((key) => {
    const value = getParamValue(searchParams?.[key])?.trim();
    if (value) params.set(key, value);
  });
  params.set("limit", "24");
  return `/api/lineups?${params.toString()}`;
}

export default async function LineupsPage({ searchParams }: LineupsPageProps) {
  const lineups = await apiFetch<Lineup[]>(buildLineupsPath(searchParams)).catch(() => []);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-valorant-red">Knowledge base</p>
        <h1 className="text-4xl font-bold text-valorant-text">Lineup 库</h1>
        <p className="text-valorant-muted">按地图、点位、英雄、攻防方、道具、来源和热度快速定位可复用点位。</p>
      </div>
      <FilterBar />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lineups.map((lineup) => <LineupCard key={lineup.id} lineup={lineup} />)}
        {lineups.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center text-valorant-muted">
            没有匹配的 Lineup，换一组筛选条件试试。
          </div>
        )}
      </div>
    </div>
  );
}
