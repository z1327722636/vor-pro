"use client";

import { useState } from "react";
import { assetUrl, type LineupStep } from "@/lib/api";
import { ImageLightbox } from "./image-lightbox";

type TripletViewerProps = {
  steps: LineupStep[];
};

export function TripletViewer({ steps }: TripletViewerProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/10 bg-valorant-panel text-sm text-valorant-muted">
        暂无关键帧
      </div>
    );
  }

  const lightboxImages = steps.map((step, i) => ({
    src: assetUrl(step.image_path) || "",
    title: step.title || `步骤 ${i + 1}`,
    description: step.note || "",
  }));

  return (
    <>
      <section className="flex flex-col gap-6">
        {steps.map((step, index) => {
          const src = assetUrl(step.image_path);
          const title = step.title || `步骤 ${index + 1}`;
          const order = index + 1;

          return (
            <article
              key={`${title}-${index}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-valorant-panel shadow-[0_18px_48px_-24px_rgba(0,0,0,0.6)]"
            >
              <div className="relative aspect-[16/9] min-h-72 bg-[#0F1923] sm:min-h-96">
                {src ? (
                  <button
                    type="button"
                    className="group absolute inset-0 cursor-zoom-in"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`查看 ${title} 大图`}
                  >
                    <img
                      src={src}
                      alt={`${title}预览`}
                      className="h-full w-full object-contain transition-opacity group-hover:opacity-90"
                      loading="lazy"
                    />
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white/70 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="6" cy="6" r="4.5" />
                        <path d="M9.5 9.5L13 13" />
                        <path d="M6 3.5v5M3.5 6h5" />
                      </svg>
                      点击放大
                    </span>
                  </button>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-valorant-muted">
                    暂无 {title} 预览
                  </div>
                )}

                <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-valorant-red px-2 text-sm font-extrabold leading-none text-white shadow-neon">
                    {order}
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-bold tracking-wider text-valorant-text backdrop-blur">
                    {title}
                  </span>
                </div>
              </div>

              {step.note ? (
                <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                  <p className="flex gap-3 text-sm leading-6 text-valorant-text">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-valorant-red" />
                    <span>{step.note}</span>
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
