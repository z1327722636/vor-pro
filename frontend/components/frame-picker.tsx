"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ImageAnnotationEditor } from "@/components/image-annotation-editor";
import { type ImageAnnotation } from "@/lib/image-annotations";

export type FrameNode = {
  id: string;
  timestampMs: number;
  note: string;
  previewUrl?: string;
  annotations: ImageAnnotation[];
};

type FramePickerProps = {
  videoUrl?: string;
  value: FrameNode[];
  onChange: (value: FrameNode[]) => void;
  sidePanelTop?: ReactNode;
  videoPanelBottom?: ReactNode;
};

function formatTimestamp(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = milliseconds % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

function createNode(timestampMs: number, previewUrl?: string): FrameNode {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `frame-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, timestampMs, note: "", previewUrl, annotations: [] };
}

export function FramePicker({ videoUrl, value, onChange, sidePanelTop, videoPanelBottom }: FramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  useEffect(() => {
    setIsVideoReady(false);
    setCurrentTimeMs(0);
  }, [videoUrl]);

  function syncCurrentTime() {
    setCurrentTimeMs(Math.round((videoRef.current?.currentTime ?? 0) * 1000));
  }

  function currentTimestampMs() {
    return Math.round((videoRef.current?.currentTime ?? 0) * 1000);
  }

  function captureCurrentFrame(): string | undefined {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return undefined;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.82);
    } catch {
      return undefined;
    }
  }

  function addNode() {
    if (!isVideoReady) return;
    const timestampMs = currentTimestampMs();
    onChange([...value, createNode(timestampMs, captureCurrentFrame())]);
  }

  function updateNode(id: string, patch: Partial<FrameNode>) {
    onChange(value.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  }

  function updateNodeToCurrentFrame(id: string) {
    if (!isVideoReady) return;
    updateNode(id, {
      timestampMs: currentTimestampMs(),
      previewUrl: captureCurrentFrame(),
      annotations: []
    });
  }

  function removeNode(id: string) {
    onChange(value.filter((node) => node.id !== id));
    if (editingNodeId === id) setEditingNodeId(null);
  }

  function seekTo(timestampMs: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestampMs / 1000;
  }

  const editingNode = value.find((node) => node.id === editingNodeId) ?? null;

  return (
    <div className="grid gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="order-1 flex flex-col gap-2">
        <video
          ref={videoRef}
          className="w-full rounded-xl border border-white/10 bg-black sm:rounded-2xl"
          src={videoUrl}
          crossOrigin="anonymous"
          controls
          onLoadedMetadata={() => {
            setIsVideoReady(true);
            syncCurrentTime();
          }}
          onTimeUpdate={syncCurrentTime}
          onSeeked={syncCurrentTime}
          onEmptied={() => setIsVideoReady(false)}
        />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 lg:hidden">
          <span className="text-xs text-valorant-muted">取帧：{formatTimestamp(currentTimeMs)}</span>
          <button type="button" onClick={addNode} disabled={!isVideoReady} className="shrink-0 cursor-pointer rounded-lg bg-valorant-red px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isVideoReady ? "添加当前帧" : "等待视频"}
          </button>
        </div>
        <p className="hidden text-xs text-valorant-muted lg:block">当前取帧时间：{formatTimestamp(currentTimeMs)}。先拖动/播放到目标画面，再添加或更新节点。</p>
      </div>

      <div className="order-2 flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 lg:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-valorant-text">关键帧节点</h3>
            <p className="mt-1 hidden text-xs text-valorant-muted sm:block">暂停到关键画面后添加节点，然后在每个节点下方填写说明。</p>
          </div>
          <button type="button" onClick={addNode} disabled={!isVideoReady} className="hidden shrink-0 cursor-pointer rounded-xl border border-valorant-red/50 px-3 py-2 text-xs font-bold text-valorant-red transition hover:bg-valorant-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50 lg:block">
            {isVideoReady ? "添加当前帧" : "等待视频"}
          </button>
        </div>

        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-valorant-muted">
            还没有节点。播放视频并停在需要的画面，点击“添加当前帧”。
          </div>
        ) : (
          <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1 lg:max-h-[360px]">
            {value.map((node, index) => (
              <article key={node.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                {node.previewUrl ? (
                  <button type="button" onClick={() => setEditingNodeId(node.id)} className="group relative block w-full cursor-pointer border-b border-white/10 bg-black/30">
                    <img src={node.previewUrl} alt={`节点 ${index + 1} 关键帧预览`} className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-1 text-xs font-bold text-white opacity-90 group-hover:text-valorant-red">
                      {node.annotations.length > 0 || node.note.trim() ? "已编辑" : "编辑图片"}
                    </span>
                  </button>
                ) : null}
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <button type="button" onClick={() => seekTo(node.timestampMs)} className="min-w-0 cursor-pointer text-left">
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-valorant-red">节点 {index + 1}</span>
                    <span className="mt-1 block text-sm font-semibold text-valorant-text">{formatTimestamp(node.timestampMs)}</span>
                    <span className="mt-1 block text-xs text-valorant-muted">{node.timestampMs} 毫秒，点击回看</span>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => seekTo(node.timestampMs)} className="cursor-pointer rounded-lg bg-black/40 px-2 py-1 text-xs text-white/70 hover:text-valorant-blue">
                      回看
                    </button>
                    <button type="button" onClick={() => updateNodeToCurrentFrame(node.id)} disabled={!isVideoReady} className="cursor-pointer rounded-lg bg-black/40 px-2 py-1 text-xs text-white/70 hover:text-valorant-blue disabled:cursor-not-allowed disabled:opacity-50">
                      更新
                    </button>
                    <button type="button" onClick={() => removeNode(node.id)} className="cursor-pointer rounded-lg bg-black/40 px-2 py-1 text-xs text-white/70 hover:text-valorant-red">
                      删除
                    </button>
                  </div>
                </div>
                <label className="block border-t border-white/10 bg-black/30 p-3">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-valorant-red">
                    节点 {index + 1} 文字描述
                  </span>
                  <textarea
                    value={node.note}
                    onChange={(event) => updateNode(node.id, { note: event.currentTarget.value })}
                    className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm leading-6 text-valorant-text outline-none placeholder:text-valorant-muted focus:border-valorant-red"
                    placeholder="写这张关键帧的用途：例如站位、准星对齐位置、跳投时机、落点效果等"
                  />
                </label>
              </article>
            ))}
          </div>
        )}
      </div>

      {videoPanelBottom ? <div className="order-3">{videoPanelBottom}</div> : null}
      {sidePanelTop ? <div className="order-4 lg:col-start-2">{sidePanelTop}</div> : null}

      {editingNode ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3 backdrop-blur" role="dialog" aria-modal="true" aria-label="编辑关键帧图片和描述">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-valorant-red">关键帧</p>
              <h2 className="mt-1 text-lg font-bold text-valorant-text">编辑图片与描述</h2>
            </div>
            <button type="button" onClick={() => setEditingNodeId(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-valorant-text">
              完成
            </button>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-valorant-panel/95 p-3">
            <ImageAnnotationEditor
              imageUrl={editingNode.previewUrl}
              note={editingNode.note}
              annotations={editingNode.annotations}
              onChange={(annotations) => updateNode(editingNode.id, { annotations })}
            />
            <textarea
              value={editingNode.note}
              onChange={(event) => updateNode(editingNode.id, { note: event.currentTarget.value })}
              className="mt-3 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-valorant-text outline-none placeholder:text-valorant-muted focus:border-valorant-red"
              placeholder="写这张关键帧的用途：例如站位、准星对齐位置、跳投时机、落点效果等"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
