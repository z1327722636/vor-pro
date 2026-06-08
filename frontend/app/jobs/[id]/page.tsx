import { ProgressStream } from "@/components/progress-stream";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const jobId = Number(params.id);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm tracking-[0.3em] text-valorant-red">任务 #{jobId}</p>
        <h1 className="mt-2 text-4xl font-bold text-valorant-text">解析进度</h1>
      </div>
      <ProgressStream jobId={jobId} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-7 text-valorant-muted">
        流水线会依次完成下载、镜头切分、视觉过滤、视觉语言模型解析与去重入库。完成后可在点位库查看结果。
      </div>
    </div>
  );
}
