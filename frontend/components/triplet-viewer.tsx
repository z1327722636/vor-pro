import { assetUrl, type LineupStep } from "@/lib/api";

type TripletViewerProps = {
  steps: LineupStep[];
};

export function TripletViewer({ steps }: TripletViewerProps) {
  if (steps.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/10 bg-valorant-panel text-sm text-valorant-muted">
        暂无关键帧
      </div>
    );
  }

  return (
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
            {/* 图区：保留 16:9 容器，图 contain 不裁，步骤 chip 浮在左上角 */}
            <div className="relative aspect-[16/9] min-h-72 bg-[#0F1923] sm:min-h-96">
              {src ? (
                <img
                  src={src}
                  alt={`${title}预览`}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-valorant-muted">
                  暂无 {title} 预览
                </div>
              )}

              {/* 步骤 chip 浮在左上角，不抢画面中央 */}
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-valorant-red px-2 text-sm font-extrabold leading-none text-white shadow-neon">
                  {order}
                </span>
                <span className="rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-bold tracking-wider text-valorant-text backdrop-blur">
                  {title}
                </span>
              </div>
            </div>

            {/* 图说：放在图下方独立区域，不与图重叠 */}
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
  );
}
