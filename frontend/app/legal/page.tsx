export default function LegalPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10 text-valorant-muted">
      <p className="text-sm tracking-[0.3em] text-valorant-red">合规说明</p>
      <h1 className="text-4xl font-bold text-valorant-text">内容来源与合规说明</h1>
      <section className="rounded-2xl border border-white/10 bg-valorant-panel p-6 leading-8">
        本站仅展示由系统或玩家生成的点位知识卡片、关键帧截图和原视频跳转链接，不二次分发原视频。若内容存在错误、侵权或不适，请使用举报入口提交反馈。
      </section>
      <section className="rounded-2xl border border-white/10 bg-valorant-panel p-6 leading-8">
        抓取与解析任务受频控和成本熔断限制；系统会优先保护平台稳定性和内容来源方权益。
      </section>
    </div>
  );
}
