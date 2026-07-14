import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12">
      <section className="grid min-h-[560px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-7">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-valorant-red">Lineup intelligence</p>
          <h1 className="text-5xl font-extrabold leading-tight text-valorant-text md:text-7xl">
            无畏契约道具点位知识库
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-valorant-muted">
            上传截图或从视频中选取关键帧，构建可搜索、可矫正、可收藏的 Lineup 知识图谱。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contribute/upload" className="rounded-xl bg-valorant-red px-6 py-4 font-bold text-white shadow-neon transition hover:scale-105">
              创建 Lineup
            </Link>
            <Link href="/lineups" className="rounded-xl border border-white/15 px-6 py-4 font-bold text-valorant-text transition hover:border-valorant-blue hover:shadow-blueNeon">
              浏览 Lineup 库
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <div className="grid grid-cols-3 gap-3">
            {['上传截图', '视频取帧', '地图标记', '技能筛选', '玩家矫正', '收藏点赞'].map((item) => (
              <div key={item} className="flex h-32 items-end rounded-2xl bg-gradient-to-br from-valorant-panel2 to-black p-4 text-sm text-valorant-muted">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
