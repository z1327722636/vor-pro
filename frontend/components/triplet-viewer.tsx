import { assetUrl, type LineupStep } from "@/lib/api";

type TripletViewerProps = {
  steps: LineupStep[];
};

export function TripletViewer({ steps }: TripletViewerProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {steps.map((step, index) => {
        const src = assetUrl(step.image_path);
        const title = step.title || `步骤 ${index + 1}`;

        return (
          <article key={`${title}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-valorant-panel">
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-valorant-panel2 to-black text-valorant-muted">
              {src ? <img src={src} alt={`${title}预览`} className="h-full w-full object-cover" /> : `${title}预览`}
            </div>
            <div className="p-4">
              <h3 className="mb-2 font-bold text-valorant-text">{title}</h3>
              <p className="text-sm leading-6 text-valorant-muted">{step.note || "暂无描述"}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
