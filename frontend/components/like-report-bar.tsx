export function LikeReportBar({ likes }: { likes: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button className="cursor-pointer rounded-xl bg-valorant-red px-5 py-3 text-sm font-bold text-white transition hover:shadow-neon">
        点赞 {likes}
      </button>
      <button className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 text-sm text-valorant-muted transition hover:border-amber-400 hover:text-amber-200">
        举报错误
      </button>
    </div>
  );
}
