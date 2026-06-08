import { getSourceLabel } from "@/lib/labels";

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-valorant-blue">
      {getSourceLabel(source)}
    </span>
  );
}
