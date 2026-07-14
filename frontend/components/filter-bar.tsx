"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown } from "@/components/dropdown";
import { abilityOptions, agentOptions, mapOptions, sideOptions, siteOptions, sourceOptions, throwOptions } from "@/lib/labels";

const withAll = (label: string, options: { value: string; label: string }[]) => [{ value: "", label }, ...options];
const mapFilterOptions = withAll("全部地图", mapOptions);
const siteFilterOptions = withAll("全部点位", siteOptions);
const sideFilterOptions = withAll("全部阵营", sideOptions);
const agentFilterOptions = withAll("全部英雄", agentOptions);
const abilityFilterOptions = withAll("全部道具", abilityOptions);
const throwFilterOptions = withAll("全部投掷", throwOptions);
const sortOptions = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "点赞最多" }
];
const COLLAPSED_FILTER_HEIGHT = 52;

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [canExpandFilters, setCanExpandFilters] = useState(false);

  useEffect(() => {
    setKeyword(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const node = filterWrapRef.current;
    if (!node) return;

    const updateOverflow = () => {
      const hasOverflow = node.scrollHeight > COLLAPSED_FILTER_HEIGHT + 1;
      setCanExpandFilters(hasOverflow);
      if (!hasOverflow) setFiltersExpanded(false);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(node);
    window.addEventListener("resize", updateOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [searchParams]);

  const activeCount = useMemo(() => {
    return ["q", "map", "site", "side", "agent", "ability", "throw_type", "source_type"].filter((key) => Boolean(searchParams.get(key))).length;
  }, [searchParams]);

  function pushHref(href: string) {
    startTransition(() => router.push(href as Parameters<typeof router.push>[0], { scroll: false }));
  }

  function pushParams(nextParams: URLSearchParams) {
    nextParams.delete("offset");
    const query = nextParams.toString();
    pushHref(query ? `${pathname}?${query}` : pathname);
  }

  function updateParam(key: string, value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    pushParams(nextParams);
  }

  function submitKeyword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParam("q", keyword.trim());
  }

  function resetFilters() {
    setKeyword("");
    pushHref(pathname);
  }

  return (
    <div className="relative z-40 overflow-visible rounded-3xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl sm:p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={submitKeyword} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-valorant-text outline-none transition placeholder:text-white/30 focus:border-valorant-red focus:shadow-neon"
              placeholder="搜索地图、英雄、道具或描述"
            />
            <button type="submit" disabled={isPending} className="cursor-pointer rounded-xl bg-valorant-red px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              搜索
            </button>
          </form>
          {activeCount > 0 ? (
            <button type="button" onClick={resetFilters} className="cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-sm text-valorant-muted transition hover:border-valorant-red hover:text-valorant-text">
              清空筛选 · {activeCount}
            </button>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <div
            ref={filterWrapRef}
            className={`flex min-w-0 flex-1 flex-wrap gap-3 overflow-hidden transition-[max-height] duration-200 ${filtersExpanded ? "max-h-[520px]" : "max-h-[52px]"}`}
          >
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("map") ?? ""} options={mapFilterOptions} ariaLabel="按地图筛选" onValueChange={(value) => updateParam("map", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("site") ?? ""} options={siteFilterOptions} ariaLabel="按点位筛选" onValueChange={(value) => updateParam("site", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("side") ?? ""} options={sideFilterOptions} ariaLabel="按攻防方筛选" onValueChange={(value) => updateParam("side", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("agent") ?? ""} options={agentFilterOptions} ariaLabel="按英雄筛选" onValueChange={(value) => updateParam("agent", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("ability") ?? ""} options={abilityFilterOptions} ariaLabel="按道具筛选" onValueChange={(value) => updateParam("ability", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("throw_type") ?? ""} options={throwFilterOptions} ariaLabel="按投掷方式筛选" onValueChange={(value) => updateParam("throw_type", value)} />
            <Dropdown className="min-w-[180px] flex-[1_1_180px]" value={searchParams.get("sort") ?? "latest"} options={sortOptions} ariaLabel="排序方式" onValueChange={(value) => updateParam("sort", value === "latest" ? "" : value)} />
          </div>

          {canExpandFilters ? (
            <button
              type="button"
              onClick={() => setFiltersExpanded((value) => !value)}
              className="mt-1 flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-valorant-red/20 bg-valorant-red/10 px-4 py-2 text-sm font-bold text-valorant-red transition hover:border-valorant-red/50 hover:bg-valorant-red/15"
            >
              {filtersExpanded ? "收起" : "更多"}
              <span
                className={`h-2 w-2 border-b-2 border-r-2 border-current transition ${
                  filtersExpanded ? "translate-y-0.5 rotate-[225deg]" : "-translate-y-0.5 rotate-45"
                }`}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {sourceOptions.map((item) => {
            const selected = (searchParams.get("source_type") ?? "") === item.value;
            return (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => updateParam("source_type", item.value)}
                className={`h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm transition ${
                  selected ? "border-valorant-red bg-valorant-red/15 text-valorant-red shadow-neon" : "border-white/10 text-valorant-muted hover:border-valorant-red hover:text-valorant-text"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
