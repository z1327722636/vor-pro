"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { FramePicker, type FrameNode } from "@/components/frame-picker";
import { ImageAnnotationEditor } from "@/components/image-annotation-editor";
import { defaultLineupBaseValue, LineupBaseFields, type LineupBaseValue } from "@/components/lineup-form";
import { MinimapCoordinatePicker, type MinimapCoordinates } from "@/components/minimap-coordinate-picker";
import { API_BASE_URL, assetUrl, type Lineup, type LineupStep } from "@/lib/api";
import { renderAnnotatedImageFile, type ImageAnnotation } from "@/lib/image-annotations";
import { getToken, setLoginRedirect } from "@/lib/auth";
import { agentAbilityOptions, agentOptions, mapOptions, sideOptions, siteOptions } from "@/lib/labels";

type UploadStep = {
  id: string;
  previewUrl?: string;
  fileName?: string;
  file?: File;
  note: string;
  annotations: ImageAnnotation[];
};

type FrameMap = { standing: number; aim: number; landing: number };
type UploadTab = "manual" | "video";

type ResolveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; playableUrl: string; title?: string | null }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type VideoLineupDraft = {
  id: string;
  form: LineupBaseValue;
  minimap: MinimapCoordinates;
  frameNodes: FrameNode[];
  savedLineupId?: number;
};

function buildFrameTimestamps(nodes: FrameNode[]): FrameMap {
  return {
    standing: nodes[0]?.timestampMs ?? 0,
    aim: nodes[1]?.timestampMs ?? 0,
    landing: nodes[2]?.timestampMs ?? 0
  };
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((item) => item.value === value)?.label ?? value;
}

function buildDraftSummary(form: LineupBaseValue) {
  const abilityOptions = agentAbilityOptions[form.agent] ?? [];
  return [
    optionLabel(mapOptions, form.map),
    optionLabel(agentOptions, form.agent),
    optionLabel(siteOptions, form.site),
    optionLabel(abilityOptions, form.ability)
  ].join(" / ");
}

function getLineupSteps(lineup: Lineup): LineupStep[] {
  if (lineup.steps?.length) return lineup.steps;
  return [
    { title: "站位", image_path: lineup.standing_image_path, note: lineup.standing_description, order_index: 0 },
    { title: "瞄准", image_path: lineup.aim_image_path, note: lineup.aim_description, order_index: 1 },
    { title: "落点", image_path: lineup.landing_image_path, note: lineup.landing_description, order_index: 2 }
  ].filter((item) => item.image_path || item.note);
}

function buildLineupSummary(lineup: Lineup) {
  const abilityOptions = agentAbilityOptions[lineup.agent] ?? [];
  return [
    optionLabel(mapOptions, lineup.map),
    optionLabel(agentOptions, lineup.agent),
    optionLabel(siteOptions, lineup.site ?? "a"),
    optionLabel(abilityOptions, lineup.ability)
  ].join(" / ");
}

function SavedLineupPreview({ lineupId }: { lineupId: number | null }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ready"; lineup: Lineup }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!lineupId) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    fetch(`${API_BASE_URL}/api/lineups/${lineupId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`预览加载失败（HTTP ${response.status}）`);
        return response.json() as Promise<Lineup>;
      })
      .then((lineup) => {
        if (!cancelled) setState({ status: "ready", lineup });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [lineupId]);

  if (!lineupId) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-valorant-muted">
        保存一个 Lineup 后，这里会在当前页面展示预览，不打断继续标注。
      </section>
    );
  }

  if (state.status === "loading") {
    return <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-valorant-muted">正在加载 Lineup 预览…</section>;
  }

  if (state.status === "error") {
    return <section className="rounded-2xl border border-valorant-red/30 bg-valorant-red/10 p-5 text-sm text-valorant-red">{state.message}</section>;
  }

  if (state.status !== "ready") return null;

  const steps = getLineupSteps(state.lineup);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-valorant-text">Lineup #{state.lineup.id}</h3>
          <p className="mt-1 text-sm text-valorant-muted">{buildLineupSummary(state.lineup)}</p>
        </div>
        <a href={`/lineups/${state.lineup.id}`} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red">
          打开详情页
        </a>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const src = assetUrl(step.image_path);
          const title = step.title || `步骤 ${index + 1}`;
          return (
            <article key={`${title}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <div className="flex aspect-video items-center justify-center bg-black text-xs text-valorant-muted">
                {src ? <img src={src} alt={`${title}预览`} className="h-full w-full object-cover" /> : `${title}预览`}
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-valorant-text">{title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-valorant-muted">{step.note || "暂无描述"}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function emptyMinimapCoordinates(): MinimapCoordinates {
  return {
    standing: { x: null, y: null },
    landing: { x: null, y: null }
  };
}

function createVideoLineupDraft(index: number, previous?: VideoLineupDraft): VideoLineupDraft {
  const base = previous?.form ?? defaultLineupBaseValue();
  return {
    id: `lineup-${index}`,
    form: { ...base, ability: base.ability || agentAbilityOptions[base.agent]?.[0]?.value || "" },
    minimap: previous?.minimap ?? emptyMinimapCoordinates(),
    frameNodes: []
  };
}

function hasDuplicateTimestamps(nodes: FrameNode[]) {
  if (nodes.length <= 1) return false;
  return new Set(nodes.map((node) => node.timestampMs)).size !== nodes.length;
}

export default function UploadContributionPage() {
  const router = useRouter();
  const search = useSearchParams();
  const initialVideoUrl = search.get("videoUrl") ?? "";
  const jobId = search.get("jobId");
  const correctFromLineupId = search.get("correctFromLineupId");
  const nextStepRef = useRef(1);
  const nextDraftRef = useRef(1);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<UploadTab>(search.get("tab") === "video" ? "video" : "manual");
  const [manualForm, setManualForm] = useState<LineupBaseValue>(() => defaultLineupBaseValue());
  const [manualMinimap, setManualMinimap] = useState<MinimapCoordinates>(() => emptyMinimapCoordinates());
  const [steps, setSteps] = useState<UploadStep[]>([{ id: "step-1", note: "", annotations: [] }]);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [videoDrafts, setVideoDrafts] = useState<VideoLineupDraft[]>(() => [createVideoLineupDraft(1)]);
  const [activeDraftId, setActiveDraftId] = useState("lineup-1");
  const [videoError, setVideoError] = useState("");
  const [resolveState, setResolveState] = useState<ResolveState>({ status: "idle" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function getAuthToken() {
    const token = getToken();
    if (!token) {
      setLoginRedirect(`${window.location.pathname}${window.location.search}`);
      router.push("/login");
      return null;
    }
    return token;
  }

  const activeDraft = videoDrafts.find((draft) => draft.id === activeDraftId) ?? videoDrafts[0];
  const canUseVideoWorkspace = resolveState.status === "ready" || !!correctFromLineupId;
  const previewLineupId = canUseVideoWorkspace ? Number(search.get("previewLineupId")) || activeDraft?.savedLineupId || null : null;

  function clearLineupPreview() {
    const params = new URLSearchParams(search.toString());
    if (!params.has("previewLineupId")) return;
    params.delete("previewLineupId");
    router.replace(`/contribute/upload?${params.toString()}`, { scroll: false });
  }

  function openLineupPreview(lineupId: number) {
    const params = new URLSearchParams(search.toString());
    params.set("tab", "video");
    params.set("previewLineupId", String(lineupId));
    router.replace(`/contribute/upload?${params.toString()}`, { scroll: false });
  }

  function updateActiveDraft(patch: Partial<VideoLineupDraft>) {
    setVideoDrafts((current) => current.map((draft) => (draft.id === activeDraft.id ? { ...draft, ...patch } : draft)));
  }

  function addVideoDraft() {
    const previous = activeDraft;
    nextDraftRef.current += 1;
    const draft = createVideoLineupDraft(nextDraftRef.current, previous);
    setVideoDrafts((current) => [...current, draft]);
    setActiveDraftId(draft.id);
    setVideoError("");
    setSubmitState({ status: "idle" });
  }

  function removeVideoDraft(id: string) {
    if (videoDrafts.length === 1) return;
    setVideoDrafts((current) => current.filter((draft) => draft.id !== id));
    if (activeDraftId === id) {
      const fallback = videoDrafts.find((draft) => draft.id !== id);
      if (fallback) setActiveDraftId(fallback.id);
    }
  }

  function addStep() {
    nextStepRef.current += 1;
    setSteps((current) => [...current, { id: `step-${nextStepRef.current}`, note: "", annotations: [] }]);
  }

  function removeStep(id: string) {
    if (steps.length === 1) return;
    const previousUrl = previewUrlsRef.current[id];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    delete previewUrlsRef.current[id];
    setSteps((current) => current.filter((item) => item.id !== id));
  }

  function handleFileChange(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const previousUrl = previewUrlsRef.current[id];
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    if (!file) {
      delete previewUrlsRef.current[id];
      setSteps((current) => current.map((item) => (item.id === id ? { ...item, previewUrl: undefined, fileName: undefined, file: undefined, annotations: [] } : item)));
      return;
    }

    const url = URL.createObjectURL(file);
    previewUrlsRef.current[id] = url;
    setSteps((current) => (
      current.map((item) => (item.id === id ? { ...item, previewUrl: url, fileName: file.name, file, annotations: [] } : item))
    ));
  }

  function updateStepNote(id: string, note: string) {
    setSteps((current) => current.map((item) => (item.id === id ? { ...item, note } : item)));
  }

  function updateStepAnnotations(id: string, annotations: ImageAnnotation[]) {
    setSteps((current) => current.map((item) => (item.id === id ? { ...item, annotations } : item)));
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    const selectedSteps = steps.filter((step) => step.file && step.previewUrl);
    if (selectedSteps.length === 0) {
      setSubmitState({ status: "error", message: "请至少选择一张步骤图" });
      return;
    }

    setSubmitState({ status: "submitting", message: "正在合成箭头、画框和备注，并上传图片..." });

    try {
      const sourceForm = new FormData(event.currentTarget);
      const form = new FormData();
      sourceForm.forEach((value, key) => {
        const isOptionalCoordinate = ["minimap_x", "minimap_y", "landing_x", "landing_y"].includes(key);
        if (key === "images" || key === "notes") return;
        if (isOptionalCoordinate && typeof value === "string" && !value.trim()) return;
        form.append(key, value);
      });

      for (let index = 0; index < selectedSteps.length; index += 1) {
        const step = selectedSteps[index];
        const annotatedFile = await renderAnnotatedImageFile({
          sourceUrl: step.previewUrl!,
          fileName: step.fileName ?? step.file?.name ?? `step-${index + 1}.jpg`,
          note: step.note,
          annotations: step.annotations
        });
        form.append("images", annotatedFile);
        form.append("notes", step.note);
      }

      const response = await fetch(`${API_BASE_URL}/api/lineups/manual-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!response.ok) {
        const detail = await response
          .json()
          .then((data) => (data && typeof data.detail === "string" ? data.detail : ""))
          .catch(() => "");
        setSubmitState({ status: "error", message: detail || `手动上传失败（HTTP ${response.status}）` });
        return;
      }
      const data = await response.json();
      setSubmitState({ status: "success", message: "上传成功，正在打开详情页..." });
      window.location.href = `/lineups/${data.id}`;
    } catch (error) {
      setSubmitState({ status: "error", message: error instanceof Error ? error.message : "图片合成或上传失败" });
    }
  }

  async function resolveVideo() {
    const token = getAuthToken();
    if (!token) return;
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      setResolveState({ status: "error", message: "请先输入视频 URL" });
      return;
    }
    clearLineupPreview();
    setResolveState({ status: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/api/manual/external-video/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source_url: trimmed })
      });
      if (!response.ok) {
        const detail = await response
          .json()
          .then((data) => (data && typeof data.detail === "string" ? data.detail : ""))
          .catch(() => "");
        setResolveState({
          status: "error",
          message: detail || `解析失败（HTTP ${response.status}），请检查链接`
        });
        return;
      }
      const data = (await response.json()) as {
        playable_url: string;
        title?: string | null;
      };
      const full = assetUrl(data.playable_url);
      if (!full) {
        setResolveState({ status: "error", message: "解析返回的播放地址为空" });
        return;
      }
      setResolveState({ status: "ready", playableUrl: full, title: data.title });
      // 解析新视频后清掉所有草稿节点，避免时间戳错位
      setVideoDrafts((current) => current.map((draft) => ({ ...draft, frameNodes: [], savedLineupId: undefined })));
    } catch (error) {
      setResolveState({
        status: "error",
        message: `解析请求异常：${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  async function pollJobUntilDone(sessionId: number, token: string): Promise<number | null> {
    const deadline = Date.now() + 60_000; // 抽帧通常 < 5s，最多等 60s
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetch(`${API_BASE_URL}/api/jobs/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!response.ok) continue;
      const job = (await response.json()) as {
        status: string;
        error_message?: string | null;
        result?: { lineup_id?: number } | null;
      };
      if (job.status === "done") return job.result?.lineup_id ?? null;
      if (job.status === "failed") {
        throw new Error(job.error_message || "抽帧任务失败");
      }
    }
    throw new Error("抽帧任务超时，请稍后到 Lineup 列表查看");
  }

  async function submitVideoFrames(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    if (!activeDraft) {
      setVideoError("请先创建一个 Lineup 草稿");
      return;
    }
    if (resolveState.status !== "ready" && !correctFromLineupId) {
      setVideoError("请先点击“解析视频”，等播放器就绪后再提交");
      return;
    }
    if (activeDraft.frameNodes.length === 0) {
      setVideoError("请至少给当前 Lineup 添加一个帧节点");
      return;
    }
    setVideoError("");
    setSubmitState({ status: "submitting", message: `正在保存 ${buildDraftSummary(activeDraft.form)}...` });

    const nodes = activeDraft.frameNodes;
    if (hasDuplicateTimestamps(nodes)) {
      setVideoError("当前 Lineup 有多个节点停在同一时间点。请分别拖动/播放到不同画面后，用“更新”或重新添加节点。");
      return;
    }

    const payload = {
      timestamps: buildFrameTimestamps(nodes),
      form: {
        ...activeDraft.form,
        standing_description: nodes[0]?.note ?? "",
        aim_description: nodes[1]?.note ?? "",
        landing_description: nodes[2]?.note ?? "",
        minimap_x: activeDraft.minimap.standing.x,
        minimap_y: activeDraft.minimap.standing.y,
        landing_x: activeDraft.minimap.landing.x,
        landing_y: activeDraft.minimap.landing.y
      },
      frame_nodes: nodes.map((node, index) => ({
        timestamp_ms: node.timestampMs,
        note: node.note,
        order_index: index
      })),
      regenerate_ai_description: false
    };

    let sessionId: number | null = null;
    let path = correctFromLineupId
      ? `/api/lineups/${correctFromLineupId}/corrections`
      : `/api/manual/video-sessions/${jobId ?? ""}/submit`;

    if (!correctFromLineupId && !jobId) {
      const sessionResponse = await fetch(`${API_BASE_URL}/api/manual/video-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source_url: videoUrl || null })
      });
      if (!sessionResponse.ok) {
        setSubmitState({ status: "error", message: `创建会话失败（HTTP ${sessionResponse.status}）` });
        return;
      }
      const session = (await sessionResponse.json()) as { session_id: number };
      sessionId = session.session_id;
      path = `/api/manual/video-sessions/${session.session_id}/submit`;
    } else if (jobId) {
      sessionId = Number(jobId);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const detail = await response
        .json()
        .then((data) => (data && typeof data.detail === "string" ? data.detail : ""))
        .catch(() => "");
      setSubmitState({ status: "error", message: detail || `提交失败（HTTP ${response.status}）` });
      return;
    }
    const data = (await response.json()) as { session_id?: number };
    const polledId = data.session_id ?? sessionId;
    if (polledId == null) {
      setSubmitState({ status: "error", message: "未拿到会话 ID，无法跟踪任务" });
      return;
    }

    setSubmitState({ status: "submitting", message: "抽帧中，请稍候..." });
    try {
      const lineupId = await pollJobUntilDone(polledId, token);
      updateActiveDraft({ savedLineupId: lineupId ?? undefined });
      if (lineupId) openLineupPreview(lineupId);
      setSubmitState({
        status: "success",
        message: lineupId ? `已保存为 Lineup #${lineupId}，已在下方生成预览，可以继续标下一个。` : "已保存，可以继续标下一个。"
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-valorant-red">Contribution</p>
        <h1 className="mt-2 text-3xl font-bold text-valorant-text sm:text-4xl">注入 Lineup</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-valorant-muted">
          选择一种注入方式：直接上传步骤图，或从视频中添加多个关键帧节点与备注。
        </p>
      </div>

      <div className="grid w-full grid-cols-2 rounded-2xl border border-white/10 bg-black/30 p-1 sm:flex sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${activeTab === "manual" ? "bg-valorant-red text-white shadow-neon" : "text-valorant-muted hover:text-valorant-text"}`}
        >
          手动上传步骤图
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${activeTab === "video" ? "bg-valorant-red text-white shadow-neon" : "text-valorant-muted hover:text-valorant-text"}`}
        >
          视频解析关键帧
        </button>
      </div>

      {activeTab === "manual" ? (
        <form onSubmit={submitManual} className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-valorant-panel/80 p-4 shadow-2xl shadow-black/30 sm:p-6">
          <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-valorant-red">基础信息</h2>
            <LineupBaseFields value={manualForm} onChange={setManualForm} />
          </section>

          <MinimapCoordinatePicker map={manualForm.map} value={manualMinimap} onChange={setManualMinimap} />
          <input type="hidden" name="minimap_x" value={manualMinimap.standing.x ?? ""} />
          <input type="hidden" name="minimap_y" value={manualMinimap.standing.y ?? ""} />
          <input type="hidden" name="landing_x" value={manualMinimap.landing.x ?? ""} />
          <input type="hidden" name="landing_y" value={manualMinimap.landing.y ?? ""} />

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-valorant-text">步骤图与备注</h2>
                <p className="mt-1 text-sm text-valorant-muted">第一张可以是主步骤图，后续继续补充背景、参照或落点图。</p>
              </div>
              <button type="button" onClick={addStep} className="rounded-xl border border-valorant-red/50 px-4 py-2 text-sm font-bold text-valorant-red transition hover:bg-valorant-red hover:text-white">
                添加一张图
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {steps.map((step, index) => (
                <article key={step.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="rounded-full border border-valorant-red/40 bg-valorant-red/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-valorant-red">
                        STEP {index + 1}
                      </span>
                      <p className="mt-2 line-clamp-1 text-xs text-valorant-muted">{step.fileName ?? "先选择截图，再拖拽画箭头或画框"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-xl border border-valorant-blue/40 px-4 py-2 text-sm font-bold text-valorant-blue transition hover:shadow-blueNeon">
                        {step.previewUrl ? "更换图片" : "选择图片"}
                        <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleFileChange(step.id, event)} />
                      </label>
                      {steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(step.id)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-valorant-muted hover:border-valorant-red hover:text-valorant-red">
                          删除
                        </button>
                      )}
                    </div>
                  </div>

                  <ImageAnnotationEditor
                    imageUrl={step.previewUrl}
                    note={step.note}
                    annotations={step.annotations}
                    onChange={(annotations) => updateStepAnnotations(step.id, annotations)}
                  />

                  <textarea
                    value={step.note}
                    onChange={(event) => updateStepNote(step.id, event.currentTarget.value)}
                    className="mt-3 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-valorant-text outline-none placeholder:text-valorant-muted focus:border-valorant-red"
                    placeholder={`步骤 ${index + 1} 备注：会显示在图片左下角，并随图片一起保存`}
                  />
                </article>
              ))}
            </div>
          </section>

          {submitState.status === "submitting" && (
            <p className="rounded-xl border border-valorant-blue/30 bg-valorant-blue/10 px-4 py-3 text-sm text-valorant-blue">{submitState.message}</p>
          )}
          {submitState.status === "success" && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{submitState.message}</p>
          )}
          {submitState.status === "error" && (
            <p className="rounded-xl border border-valorant-red/30 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-red">{submitState.message}</p>
          )}

          <button disabled={submitState.status === "submitting"} className="cursor-pointer rounded-xl bg-valorant-red px-6 py-4 font-bold text-white hover:shadow-neon disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            {submitState.status === "submitting" ? "提交中..." : "提交 Lineup"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitVideoFrames} className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-valorant-panel/80 p-4 shadow-2xl shadow-black/30 sm:p-6">
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-valorant-text">视频解析关键帧</h2>
              <p className="mt-1 text-sm text-valorant-muted">
                贴入 B 站等视频页 URL，点击“解析视频”等待后端下载完成；播放器就绪后按顺序添加任意数量的帧节点。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={videoUrl}
                onChange={(event) => {
                  setVideoUrl(event.currentTarget.value);
                  clearLineupPreview();
                  if (resolveState.status !== "idle") setResolveState({ status: "idle" });
                }}
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-valorant-text outline-none placeholder:text-valorant-muted"
                placeholder="视频 URL，例如 https://www.bilibili.com/video/BVxxxx"
                disabled={!!correctFromLineupId}
              />
              {!correctFromLineupId && (
                <button
                  type="button"
                  onClick={resolveVideo}
                  disabled={resolveState.status === "loading"}
                  className="shrink-0 cursor-pointer rounded-xl border border-valorant-blue/40 px-5 py-3 text-sm font-bold text-valorant-blue transition hover:shadow-blueNeon disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resolveState.status === "loading" ? "解析中…" : "解析视频"}
                </button>
              )}
            </div>

            {resolveState.status === "loading" && (
              <p className="rounded-xl border border-valorant-blue/30 bg-valorant-blue/10 px-4 py-3 text-sm text-valorant-blue">
                正在下载视频到服务器，B 站视频通常需要 5–30 秒，请勿离开本页…
              </p>
            )}
            {resolveState.status === "error" && (
              <p className="rounded-xl border border-valorant-red/30 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-red">
                {resolveState.message}
              </p>
            )}
            {resolveState.status === "ready" && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                视频已就绪{resolveState.title ? `：${resolveState.title}` : ""}，请在播放器中暂停到关键画面，点击“添加当前帧”。
              </p>
            )}

            {canUseVideoWorkspace && activeDraft && (
              <FramePicker
                videoUrl={
                  resolveState.status === "ready" ? resolveState.playableUrl : videoUrl || undefined
                }
                value={activeDraft.frameNodes}
                onChange={(nodes) => updateActiveDraft({ frameNodes: nodes, savedLineupId: undefined })}
                sidePanelTop={
                  <div className="flex flex-col gap-4">
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-valorant-text">这个视频里的 Lineup</h3>
                          <p className="mt-1 text-xs text-valorant-muted">一个视频可连续标多个技能/点位。</p>
                        </div>
                        <button type="button" onClick={addVideoDraft} className="shrink-0 cursor-pointer rounded-xl border border-valorant-red/50 px-3 py-2 text-xs font-bold text-valorant-red hover:bg-valorant-red hover:text-white">
                          新建
                        </button>
                      </div>
                      <div className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                        {videoDrafts.map((draft, index) => (
                          <article key={draft.id} className={`rounded-xl border p-3 transition ${draft.id === activeDraft.id ? "border-valorant-red/50 bg-valorant-red/10" : "border-white/10 bg-black/20"}`}>
                            <div className="flex items-center justify-between gap-2">
                              <button type="button" onClick={() => setActiveDraftId(draft.id)} className="min-w-0 cursor-pointer text-left">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-valorant-red">Lineup {index + 1}</span>
                              </button>
                              {draft.savedLineupId ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">已保存 #{draft.savedLineupId}</span> : null}
                            </div>
                            <button type="button" onClick={() => setActiveDraftId(draft.id)} className="mt-1 block w-full cursor-pointer text-left">
                              <p className="line-clamp-2 text-sm font-semibold text-valorant-text">{buildDraftSummary(draft.form)}</p>
                              <p className="mt-1 text-xs text-valorant-muted">
                                {optionLabel(sideOptions, draft.form.side)} · {draft.frameNodes.length} 个帧节点
                              </p>
                            </button>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                              {draft.savedLineupId ? (
                                <button type="button" onClick={() => openLineupPreview(draft.savedLineupId!)} className="cursor-pointer text-emerald-300 hover:text-white">预览</button>
                              ) : null}
                              {videoDrafts.length > 1 && !draft.savedLineupId ? (
                                <button type="button" onClick={() => removeVideoDraft(draft.id)} className="cursor-pointer text-valorant-muted hover:text-valorant-red">删除草稿</button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-valorant-red">当前 Lineup 信息</h3>
                      <LineupBaseFields
                        value={activeDraft.form}
                        onChange={(form) => updateActiveDraft({ form, savedLineupId: undefined })}
                        columnsClassName="grid-cols-1"
                      />
                    </section>

                    <MinimapCoordinatePicker
                      map={activeDraft.form.map}
                      value={activeDraft.minimap}
                      onChange={(minimap) => updateActiveDraft({ minimap, savedLineupId: undefined })}
                    />
                  </div>
                }
              />
            )}
          </section>

          {canUseVideoWorkspace ? <SavedLineupPreview lineupId={previewLineupId} /> : null}

          {videoError ? <p className="rounded-xl border border-valorant-red/30 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-red">{videoError}</p> : null}
          {submitState.status === "submitting" && (
            <p className="rounded-xl border border-valorant-blue/30 bg-valorant-blue/10 px-4 py-3 text-sm text-valorant-blue">{submitState.message}</p>
          )}
          {submitState.status === "success" && (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{submitState.message}</p>
          )}
          {submitState.status === "error" && (
            <p className="rounded-xl border border-valorant-red/30 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-red">{submitState.message}</p>
          )}

          {canUseVideoWorkspace ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={addVideoDraft} className="cursor-pointer rounded-xl border border-valorant-blue/40 px-5 py-3 text-sm font-bold text-valorant-blue hover:shadow-blueNeon">继续标下一个 Lineup</button>
              {activeDraft?.savedLineupId ? (
                <button type="button" onClick={() => openLineupPreview(activeDraft.savedLineupId!)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red">预览已保存 Lineup</button>
              ) : null}
              <button
                type="submit"
                disabled={submitState.status === "submitting" || !!activeDraft?.savedLineupId}
                className="cursor-pointer rounded-xl bg-valorant-red px-5 py-3 text-sm font-bold text-white hover:shadow-neon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState.status === "submitting" ? "保存中…" : activeDraft?.savedLineupId ? "当前已保存" : "保存当前 Lineup"}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
