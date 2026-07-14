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
    setScale((s) => clampScale(s * 1.1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const ns = clampScale(s / 1.1);
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070d]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* 顶部工具栏 */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-4">
        <span className="rounded-lg border border-white/15 bg-[#05070d]/90 px-3 py-1.5 text-xs font-bold tracking-wider text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur">
          {index + 1} / {total}{isZoomed ? ` · ${Math.round(scale * 100)}%` : ""}
        </span>

        <div className="flex items-center gap-2">
          {/* 缩小 */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/90 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#111827] disabled:opacity-40"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/90 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#111827] disabled:opacity-40"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/90 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#111827] disabled:opacity-40"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/90 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#111827]"
            onClick={onClose}
            aria-label="关闭预览"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 图片区域 - 用整屏作为缩放画布，按钮和描述浮在上层 */}
      <div
        className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden ${isZoomed ? "cursor-grab" : "cursor-default"} ${dragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <img
          src={current.src}
          alt={current.title}
          className="max-h-[calc(100vh-180px)] max-w-[90vw] object-contain select-none"
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
          <div className="mb-3 max-w-xl rounded-xl border border-white/25 bg-[#05070d] px-5 py-2 text-center shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
            {current.description ? (
              <p className="text-sm font-bold leading-relaxed text-white">
                {current.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 上一张 */}
      {hasPrev ? (
        <button
          className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/85 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur transition-colors hover:bg-[#111827]"
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
          className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#05070d]/85 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur transition-colors hover:bg-[#111827]"
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
