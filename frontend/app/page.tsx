import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12">
      <section className="grid min-h-[560px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-7">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-valorant-red">Lineup intelligence</p>
          <h1 className="text-5xl font-extrabold leading-tight text-valorant-text md:text-7xl">
            从视频里挖出可复用的无畏契约道具点位
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-valorant-muted">
            自动解析 B站、抖音和本地视频，也支持玩家手动上传三联图、在视频中标关键帧，以及矫正 AI 识别错误的结果。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/jobs/new" className="rounded-xl bg-valorant-red px-6 py-4 font-bold text-white shadow-neon transition hover:scale-105">
              AI 自动解析
            </Link>
            <Link href="/contribute/upload" className="rounded-xl border border-white/15 px-6 py-4 font-bold text-valorant-text transition hover:border-valorant-blue hover:shadow-blueNeon">
              我自己投稿
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <div className="grid grid-cols-3 gap-3">
            {['站位帧', '瞄准帧', '落点帧', '地图筛选', '玩家矫正', '点赞排序'].map((item) => (
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
