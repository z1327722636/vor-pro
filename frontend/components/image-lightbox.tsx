"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LightboxImage = {
  src: string;
  title: string;
  description: string;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
};

function clampScale(s: number) {
  return Math.min(Math.max(s, 1), 5);
}

export function ImageLightbox({ images, index: initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const current = images[index];
  const total = images.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;
  const isZoomed = scale > 1;

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setIndex((i) => i - 1);
    resetView();
  }, [hasPrev, resetView]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setIndex((i) => i + 1);
    resetView();
  }, [hasNext, resetView]);

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const ns = clampScale(s / 1.2);
      if (ns <= 1.01) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return ns;
    });
  }, []);

  // Mouse drag events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
    },
    [isZoomed, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPan({
        x: panStart.current.x + e.clientX - dragStart.current.x,
        y: panStart.current.y + e.clientY - dragStart.current.y,
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
          e.preventDefault();
          zoomOut();
          break;
      }
    },
    [onClose, goPrev, goNext, zoomIn, zoomOut],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const handleGlobalUp = () => setDragging(false);
    document.addEventListener("mouseup", handleGlobalUp);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mouseup", handleGlobalUp);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      {/* 顶部工具栏 */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-4">
        <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-white/70 backdrop-blur">
          {index + 1} / {total}{isZoomed ? ` · ${Math.round(scale * 100)}%` : ""}
        </span>

        <div className="flex items-center gap-2">
          {/* 缩小 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-30"
            onClick={zoomOut}
            disabled={!isZoomed}
            aria-label="缩小"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M8 11h6" />
            </svg>
          </button>

          {/* 放大 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-30"
            onClick={zoomIn}
            disabled={scale >= 5}
            aria-label="放大"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M8 11h6M11 8v6" />
            </svg>
          </button>

          {/* 1:1 还原 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-30"
            onClick={resetView}
            disabled={!isZoomed}
            aria-label="还原"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7V3h4M21 17v4h-4M17 3h4v4M7 21H3v-4" />
            </svg>
          </button>

          {/* 关闭 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            onClick={onClose}
            aria-label="关闭预览"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 图片区域 - 缩放时切换到"铺满屏幕"模式，scale 从铺满状态向外扩张 */}
      <div
        className={`flex flex-1 items-center justify-center overflow-hidden px-4 py-16 ${isZoomed ? "cursor-grab" : "cursor-default"} ${dragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          src={current.src}
          alt={current.title}
          className={
            isZoomed
              ? "h-full w-full object-cover select-none"
              : "max-h-[calc(100vh-180px)] max-w-full object-contain select-none"
          }
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      </div>

      {/* 底部描述 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center px-4 pb-6">
        {(current.title || current.description) ? (
          <div className="mb-3 max-w-lg rounded-xl border border-white/10 bg-white/5 px-5 py-1 text-center backdrop-blur">
           
            {current.description ? (
              <p className={`text-sm leading-relaxed text-white/55 `}>
                {current.description}
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-[11px] text-white/25">
          ← → 切换 · ± 缩放 · 拖拽平移 · 1:1 还原 · Esc 关闭
        </p>
      </div>

      {/* 上一张 */}
      {hasPrev ? (
        <button
          className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="上一张"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : null}

      {/* 下一张 */}
      {hasNext ? (
        <button
          className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="下一张"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
