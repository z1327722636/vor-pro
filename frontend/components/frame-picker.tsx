"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export type FrameNode = {
  id: string;
  timestampMs: number;
  note: string;
  previewUrl?: string;
};

type FramePickerProps = {
  videoUrl?: string;
  value: FrameNode[];
  onChange: (value: FrameNode[]) => void;
  sidePanelTop?: ReactNode;
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
  return { id, timestampMs, note: "", previewUrl };
}

export function FramePicker({ videoUrl, value, onChange, sidePanelTop }: FramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

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
      previewUrl: captureCurrentFrame()
    });
  }

  function removeNode(id: string) {
    onChange(value.filter((node) => node.id !== id));
  }

  function seekTo(timestampMs: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestampMs / 1000;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-2">
        <video
          ref={videoRef}
          className="w-full rounded-2xl border border-white/10 bg-black"
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
        <p className="text-xs text-valorant-muted">当前取帧时间：{formatTimestamp(currentTimeMs)}。先拖动/播放到目标画面，再添加或更新节点。</p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        {sidePanelTop}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-valorant-text">关键帧图片与文字描述</h3>
            <p className="mt-1 text-xs text-valorant-muted">暂停到关键画面后添加节点，然后在每个节点下方填写说明。</p>
          </div>
          <button type="button" onClick={addNode} disabled={!isVideoReady} className="shrink-0 cursor-pointer rounded-xl border border-valorant-red/50 px-3 py-2 text-xs font-bold text-valorant-red transition hover:bg-valorant-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isVideoReady ? "添加当前帧" : "等待视频"}
          </button>
        </div>

        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-valorant-muted">
            还没有节点。播放视频并停在需要的画面，点击“添加当前帧”。
          </div>
        ) : (
          <div className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
            {value.map((node, index) => (
              <article key={node.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                {node.previewUrl ? (
                  <button type="button" onClick={() => seekTo(node.timestampMs)} className="block w-full cursor-pointer border-b border-white/10 bg-black/30">
                    <img src={node.previewUrl} alt={`节点 ${index + 1} 关键帧预览`} className="aspect-video w-full object-cover" />
                  </button>
                ) : null}
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <button type="button" onClick={() => seekTo(node.timestampMs)} className="min-w-0 cursor-pointer text-left">
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-valorant-red">节点 {index + 1}</span>
                    <span className="mt-1 block text-sm font-semibold text-valorant-text">{formatTimestamp(node.timestampMs)}</span>
                    <span className="mt-1 block text-xs text-valorant-muted">{node.timestampMs} 毫秒，点击回看</span>
                  </button>
                  <div className="flex shrink-0 gap-2">
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
    </div>
  );
}
