"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "@/components/dropdown";
import { LineupBaseFields, defaultLineupBaseValue, type LineupBaseValue } from "@/components/lineup-form";
import { MinimapCoordinatePicker, type MinimapCoordinates } from "@/components/minimap-coordinate-picker";
import { API_BASE_URL, assetUrl, type CurrentUser, type Lineup, type LineupStep } from "@/lib/api";
import { clearToken, getToken, setLoginRedirect } from "@/lib/auth";
import { getAbilityLabel, getAgentLabel, getMapLabel, getSideLabel, getSiteLabel, getThrowLabel, sourceOptions } from "@/lib/labels";

type AdminLineupFormValue = LineupBaseValue & {
  source_type: string;
  standing_description: string;
  aim_description: string;
  landing_description: string;
  original_video_url: string;
  original_video_timestamp_ms: string;
  minimap_x: string;
  minimap_y: string;
  landing_x: string;
  landing_y: string;
  dedup_hash: string;
  is_hidden: boolean;
};

type AdminLineupPayload = Omit<AdminLineupFormValue, "original_video_url" | "original_video_timestamp_ms" | "minimap_x" | "minimap_y" | "landing_x" | "landing_y" | "dedup_hash"> & {
  original_video_url: string | null;
  original_video_timestamp_ms: number | null;
  minimap_x: number | null;
  minimap_y: number | null;
  landing_x: number | null;
  landing_y: number | null;
  dedup_hash?: string;
};

const sourceTypeOptions = sourceOptions.filter((option) => option.value);

function defaultFormValue(): AdminLineupFormValue {
  return {
    ...defaultLineupBaseValue(),
    source_type: "user_upload",
    standing_description: "",
    aim_description: "",
    landing_description: "",
    original_video_url: "",
    original_video_timestamp_ms: "",
    minimap_x: "",
    minimap_y: "",
    landing_x: "",
    landing_y: "",
    dedup_hash: "",
    is_hidden: false
  };
}

function formValueFromLineup(lineup: Lineup): AdminLineupFormValue {
  return {
    map: lineup.map,
    site: lineup.site ?? "a",
    side: lineup.side,
    agent: lineup.agent,
    ability: lineup.ability,
    throw_type: lineup.throw_type,
    source_type: lineup.source_type,
    standing_description: lineup.standing_description ?? "",
    aim_description: lineup.aim_description ?? "",
    landing_description: lineup.landing_description ?? "",
    original_video_url: lineup.original_video_url ?? "",
    original_video_timestamp_ms: lineup.original_video_timestamp_ms?.toString() ?? "",
    minimap_x: lineup.minimap_x?.toString() ?? "",
    minimap_y: lineup.minimap_y?.toString() ?? "",
    landing_x: lineup.landing_x?.toString() ?? "",
    landing_y: lineup.landing_y?.toString() ?? "",
    dedup_hash: "",
    is_hidden: lineup.is_hidden
  };
}

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, parsed));
}

function formToMinimapCoordinates(form: AdminLineupFormValue): MinimapCoordinates {
  return {
    standing: { x: parseCoordinate(form.minimap_x), y: parseCoordinate(form.minimap_y) },
    landing: { x: parseCoordinate(form.landing_x), y: parseCoordinate(form.landing_y) }
  };
}

function coordinateToFormValue(value: number | null) {
  return value == null ? "" : value.toFixed(4);
}

function buildPayload(form: AdminLineupFormValue): AdminLineupPayload {
  const dedupHash = form.dedup_hash.trim();
  return {
    map: form.map,
    site: form.site,
    side: form.side,
    agent: form.agent,
    ability: form.ability,
    throw_type: form.throw_type,
    source_type: form.source_type,
    standing_description: form.standing_description,
    aim_description: form.aim_description,
    landing_description: form.landing_description,
    original_video_url: form.original_video_url.trim() || null,
    original_video_timestamp_ms: form.original_video_timestamp_ms.trim() ? Number(form.original_video_timestamp_ms) : null,
    minimap_x: parseCoordinate(form.minimap_x),
    minimap_y: parseCoordinate(form.minimap_y),
    landing_x: parseCoordinate(form.landing_x),
    landing_y: parseCoordinate(form.landing_y),
    ...(dedupHash ? { dedup_hash: dedupHash } : {}),
    is_hidden: form.is_hidden
  };
}

function getLineupSteps(lineup: Lineup): LineupStep[] {
  if (lineup.steps?.length) return lineup.steps;
  return [
    { title: "站位", image_path: lineup.standing_image_path, note: lineup.standing_description, order_index: 0 },
    { title: "瞄准", image_path: lineup.aim_image_path, note: lineup.aim_description, order_index: 1 },
    { title: "落点", image_path: lineup.landing_image_path, note: lineup.landing_description, order_index: 2 }
  ].filter((item) => item.image_path || item.note);
}

function LineupPreview({ lineup }: { lineup: Lineup }) {
  const steps = getLineupSteps(lineup);
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-valorant-text">图片预览</h3>
        <Link href={`/lineups/${lineup.id}`} target="_blank" className="text-sm font-bold text-valorant-blue hover:text-valorant-red">
          打开详情
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.slice(0, 3).map((step, index) => {
          const src = assetUrl(step.image_path);
          const title = step.title || `步骤 ${index + 1}`;
          return (
            <div key={`${title}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-valorant-navy">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-valorant-panel2 to-black text-sm text-valorant-muted">
                {src ? <img src={src} alt={`${title}预览`} className="h-full w-full object-cover" /> : "暂无图片"}
              </div>
              <p className="px-3 py-2 text-sm font-bold text-valorant-text">{title}</p>
            </div>
          );
        })}
        {steps.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-valorant-muted md:col-span-3">没有可预览的步骤图。</p> : null}
      </div>
    </section>
  );
}

export default function AdminLineupsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [selected, setSelected] = useState<Lineup | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<AdminLineupFormValue>(() => defaultFormValue());
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async function request<T>(path: string, authToken: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });
    if (response.status === 401) {
      clearToken();
      setLoginRedirect("/admin/lineups");
      router.replace("/login");
      throw new Error("请重新登录。");
    }
    if (response.status === 403) throw new Error("当前账号不是管理员。");
    if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }, [router]);

  const loadLineups = useCallback(async function loadLineups(authToken: string) {
    const data = await request<Lineup[]>("/api/admin/lineups?limit=500", authToken);
    setLineups(data);
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const authToken = getToken();
      if (!authToken) {
        setLoginRedirect("/admin/lineups");
        router.replace("/login");
        return;
      }
      setToken(authToken);
      try {
        const currentUser = await request<CurrentUser>("/api/auth/me", authToken);
        if (!currentUser.is_admin) {
          setError("当前账号不是管理员，不能进入 Lineup 管理。");
          return;
        }
        if (!cancelled) {
          setUser(currentUser);
          await loadLineups(authToken);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "加载失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadLineups, request, router]);

  const filteredLineups = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return lineups;
    return lineups.filter((lineup) => [lineup.id.toString(), lineup.map, lineup.site, lineup.agent, lineup.ability, lineup.throw_type]
      .some((value) => value?.toLowerCase().includes(keyword)));
  }, [lineups, query]);
  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedCount = selectedIdList.length;
  const isEditorOpen = Boolean(selected || isCreating);

  function toggleLineupSelection(lineupId: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(lineupId);
      else next.delete(lineupId);
      return next;
    });
  }

  function selectFilteredLineups() {
    setSelectedIds(new Set(filteredLineups.map((lineup) => lineup.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkSetHidden(isHidden: boolean) {
    if (!token || selectedCount === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await request<{ updated: number }>("/api/admin/lineups/bulk", token, {
        method: "PATCH",
        body: JSON.stringify({ ids: selectedIdList, is_hidden: isHidden })
      });
      await loadLineups(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "批量操作失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function bulkDelete() {
    if (!token || selectedCount === 0) return;
    if (!window.confirm(`确认真删除选中的 ${selectedCount} 个 Lineup？此操作不可恢复。`)) return;
    setIsSaving(true);
    setError(null);
    try {
      await request<{ deleted: number }>("/api/admin/lineups/bulk", token, {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIdList })
      });
      if (selected && selectedIds.has(selected.id)) startCreate();
      clearSelection();
      await loadLineups(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "批量删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  function resetEditor() {
    setSelected(null);
    setIsCreating(false);
    setForm(defaultFormValue());
  }

  function startCreate() {
    setSelected(null);
    setIsCreating(true);
    setForm(defaultFormValue());
    setError(null);
  }

  function startEdit(lineup: Lineup) {
    setSelected(lineup);
    setIsCreating(false);
    setForm(formValueFromLineup(lineup));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = selected
        ? await request<Lineup>(`/api/admin/lineups/${selected.id}`, token, { method: "PATCH", body: JSON.stringify(buildPayload(form)) })
        : await request<Lineup>("/api/admin/lineups", token, { method: "POST", body: JSON.stringify(buildPayload(form)) });
      setSelected(saved);
      setForm(formValueFromLineup(saved));
      await loadLineups(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelected() {
    if (!token || !selected) return;
    if (!window.confirm(`确认真删除 Lineup #${selected.id}？此操作不可恢复。`)) return;
    setIsSaving(true);
    setError(null);
    try {
      await request<void>(`/api/admin/lineups/${selected.id}`, token, { method: "DELETE" });
      resetEditor();
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(selected.id);
        return next;
      });
      await loadLineups(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="min-h-[calc(100vh-4rem)]" />;

  if (!user?.is_admin) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <section className="rounded-3xl border border-valorant-red/30 bg-valorant-panel p-8">
          <h1 className="text-2xl font-bold text-valorant-text">无权访问</h1>
          <p className="mt-3 text-valorant-muted">{error ?? "当前账号不是管理员。"}</p>
          <Link href="/lineups" className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red">
            返回 Lineup 库
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-10 xl:grid-cols-[420px_1fr]">
      <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-valorant-panel p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm tracking-[0.28em] text-valorant-red">ADMIN</p>
            <h1 className="text-2xl font-bold text-valorant-text">Lineup 管理</h1>
          </div>
          <button type="button" onClick={startCreate} className="cursor-pointer rounded-xl bg-valorant-red px-4 py-2 text-sm font-bold text-white hover:shadow-neon">
            新建
          </button>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="按 ID / 地图 / 英雄 / 技能搜索" />
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
          <span className="mr-auto text-valorant-muted">已选 {selectedCount} 个</span>
          <button type="button" onClick={selectFilteredLineups} disabled={filteredLineups.length === 0 || isSaving} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-valorant-text hover:border-valorant-blue hover:text-valorant-blue disabled:cursor-not-allowed disabled:opacity-50">
            全选当前
          </button>
          <button type="button" onClick={clearSelection} disabled={selectedCount === 0 || isSaving} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-valorant-text hover:border-valorant-blue hover:text-valorant-blue disabled:cursor-not-allowed disabled:opacity-50">
            清空
          </button>
          <button type="button" onClick={() => bulkSetHidden(true)} disabled={selectedCount === 0 || isSaving} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-valorant-text hover:border-valorant-red hover:text-valorant-red disabled:cursor-not-allowed disabled:opacity-50">
            批量隐藏
          </button>
          <button type="button" onClick={() => bulkSetHidden(false)} disabled={selectedCount === 0 || isSaving} className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-valorant-text hover:border-emerald-300 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
            批量公开
          </button>
          <button type="button" onClick={bulkDelete} disabled={selectedCount === 0 || isSaving} className="cursor-pointer rounded-lg border border-valorant-red/40 px-3 py-2 font-bold text-valorant-red hover:bg-valorant-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
            批量真删除
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1 xl:max-h-[calc(100vh-320px)]">
          <div className="flex flex-col gap-3">
            {filteredLineups.map((lineup) => {
              const checked = selectedIds.has(lineup.id);
              return (
                <div key={lineup.id} className={`rounded-2xl border p-4 transition ${selected?.id === lineup.id ? "border-valorant-red bg-valorant-red/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={checked} onChange={(event) => toggleLineupSelection(lineup.id, event.target.checked)} aria-label={`选择 Lineup ${lineup.id}`} className="mt-1 h-4 w-4 accent-valorant-red" />
                    <button type="button" onClick={() => startEdit(lineup)} className="min-w-0 flex-1 cursor-pointer text-left">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold text-valorant-text">#{lineup.id} {getMapLabel(lineup.map)} · {getAgentLabel(lineup.agent)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${lineup.is_hidden ? "bg-valorant-red/20 text-valorant-red" : "bg-emerald-400/15 text-emerald-300"}`}>{lineup.is_hidden ? "隐藏" : "公开"}</span>
                      </div>
                      <p className="mt-2 text-sm text-valorant-muted">{getSiteLabel(lineup.site ?? "a")} / {getSideLabel(lineup.side)} / {getAbilityLabel(lineup.ability)} / {getThrowLabel(lineup.throw_type)}</p>
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredLineups.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-valorant-muted">没有匹配的 Lineup。</p> : null}
          </div>
        </div>
      </section>

      {isEditorOpen ? (
        <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-valorant-panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-valorant-muted">{selected ? `编辑 #${selected.id}` : "创建新 Lineup"}</p>
              <h2 className="text-2xl font-bold text-valorant-text">{selected ? `${getMapLabel(selected.map)} · ${getAgentLabel(selected.agent)}` : "基础信息"}</h2>
            </div>
            {selected ? (
              <button type="button" onClick={deleteSelected} disabled={isSaving} className="cursor-pointer rounded-xl border border-valorant-red/40 px-4 py-2 text-sm font-bold text-valorant-red hover:bg-valorant-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                真删除
              </button>
            ) : null}
          </div>

          {selected ? <LineupPreview lineup={selected} /> : null}

          <LineupBaseFields value={form} onChange={(next) => setForm((current) => ({ ...current, ...next }))} columnsClassName="md:grid-cols-2 xl:grid-cols-3" />

          <div className="grid gap-4 md:grid-cols-2">
            <Dropdown value={form.source_type} options={sourceTypeOptions} ariaLabel="选择来源" onValueChange={(value) => setForm((current) => ({ ...current, source_type: value }))} />
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-valorant-text">
              <input type="checkbox" checked={form.is_hidden} onChange={(event) => setForm((current) => ({ ...current, is_hidden: event.target.checked }))} className="h-4 w-4 accent-valorant-red" />
              隐藏该 Lineup
            </label>
            <input value={form.original_video_url} onChange={(event) => setForm((current) => ({ ...current, original_video_url: event.target.value }))} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="原视频 URL（可选）" />
            <input value={form.original_video_timestamp_ms} onChange={(event) => setForm((current) => ({ ...current, original_video_timestamp_ms: event.target.value }))} type="number" min="0" className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="原视频时间戳 ms（可选）" />
            <input value={form.dedup_hash} onChange={(event) => setForm((current) => ({ ...current, dedup_hash: event.target.value }))} className="md:col-span-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="去重哈希（留空则创建时自动生成）" />
          </div>

          <MinimapCoordinatePicker
            map={form.map}
            value={formToMinimapCoordinates(form)}
            onChange={(coordinates) => setForm((current) => ({
              ...current,
              minimap_x: coordinateToFormValue(coordinates.standing.x),
              minimap_y: coordinateToFormValue(coordinates.standing.y),
              landing_x: coordinateToFormValue(coordinates.landing.x),
              landing_y: coordinateToFormValue(coordinates.landing.y)
            }))}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <textarea value={form.standing_description} onChange={(event) => setForm((current) => ({ ...current, standing_description: event.target.value }))} className="min-h-36 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="站位备注" />
            <textarea value={form.aim_description} onChange={(event) => setForm((current) => ({ ...current, aim_description: event.target.value }))} className="min-h-36 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="瞄准备注" />
            <textarea value={form.landing_description} onChange={(event) => setForm((current) => ({ ...current, landing_description: event.target.value }))} className="min-h-36 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" placeholder="落点备注" />
          </div>

          {error ? <p className="rounded-xl border border-valorant-red/40 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-text">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isSaving} className="cursor-pointer rounded-xl bg-valorant-red px-5 py-3 font-bold text-white hover:shadow-neon disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? "保存中..." : selected ? "保存修改" : "创建 Lineup"}
            </button>
            <button type="button" onClick={() => token && loadLineups(token)} className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 font-bold text-valorant-text hover:border-valorant-blue hover:text-valorant-blue">
              刷新列表
            </button>
          </div>
        </form>
      ) : (
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-valorant-panel p-8 text-center">
          <h2 className="text-2xl font-bold text-valorant-text">未选择 Lineup</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-valorant-muted">
            左侧选择一条 Lineup 才会显示编辑内容；需要新增时再点击左上角「新建」。删除完后这里不会再自动保留旧内容。
          </p>
          {error ? <p className="mt-5 rounded-xl border border-valorant-red/40 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-text">{error}</p> : null}
        </section>
      )}
    </div>
  );
}
