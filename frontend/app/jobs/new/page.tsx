"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { clearToken, getToken, setLoginRedirect } from "@/lib/auth";

type VideoSearchResult = {
  platform: string;
  url: string;
  title?: string | null;
  uploader?: string | null;
};

export default function NewJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "keyword">("url");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [parsingUrl, setParsingUrl] = useState<string | null>(null);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [videoResults, setVideoResults] = useState<VideoSearchResult[]>([]);

  function redirectToLogin() {
    setLoginRedirect(`${window.location.pathname}${window.location.search}`);
    router.push("/login");
  }

  function requireToken(): string | null {
    const token = getToken();
    if (!token) {
      setError("请先登录后再提交解析任务。");
      redirectToLogin();
      return null;
    }
    return token;
  }

  function handleUnauthorized() {
    clearToken();
    setError("登录已失效，请重新登录。");
    redirectToLogin();
  }

  async function createUrlJob(sourceUrl: string) {
    const token = requireToken();
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ source_type: "url", source_url: sourceUrl })
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) {
      setError("提交解析任务失败，请稍后重试。");
      console.error("submit job failed", response.status);
      return;
    }
    const data = (await response.json()) as { id: number };
    router.push(`/jobs/${data.id}`);
  }

  async function searchVideos(keyword: string) {
    const token = requireToken();
    if (!token) return;

    setError(null);
    setIsSearching(true);
    setSearchedKeyword(keyword);
    setVideoResults([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/search-videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keyword, limit: 20 })
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        setError("搜索视频失败，请稍后重试。");
        console.error("search videos failed", response.status);
        return;
      }
      const data = (await response.json()) as { results: VideoSearchResult[] };
      setVideoResults(data.results);
    } catch (err) {
      setError("搜索视频失败，请确认后端服务已启动。");
      console.error("search videos failed", err);
    } finally {
      setIsSearching(false);
    }
  }

  async function parseVideo(video: VideoSearchResult) {
    setError(null);
    setParsingUrl(video.url);
    try {
      await createUrlJob(video.url);
    } catch (err) {
      setError("提交解析任务失败，请确认后端服务已启动。");
      console.error("submit job failed", err);
    } finally {
      setParsingUrl(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = value.trim();

    if (!input) {
      setError("请输入要解析的视频链接或关键词。");
      return;
    }

    if (mode === "keyword") {
      await searchVideos(input);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createUrlJob(input);
    } catch (err) {
      setError("提交解析任务失败，请确认后端服务已启动。");
      console.error("submit job failed", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isSearching || parsingUrl !== null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-valorant-red">AI pipeline</p>
        <h1 className="mt-2 text-4xl font-bold text-valorant-text">提交解析任务</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-valorant-panel/80 p-6">
        <div className="flex gap-3">
          {(["url", "keyword"] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setMode(item); setError(null); }} className={`cursor-pointer rounded-xl px-5 py-3 text-sm font-bold ${mode === item ? "bg-valorant-red text-white" : "border border-white/10 text-valorant-muted"}`}>
              {item === "url" ? "链接解析" : "关键词搜索"}
            </button>
          ))}
        </div>
        <input className="rounded-xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-valorant-red" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "url" ? "粘贴 B站/抖音/TikTok 视频链接" : "例如 Sova Bind 进攻 lineup"} />
        {error && <p className="text-sm text-valorant-red">{error}</p>}
        <button className="cursor-pointer rounded-xl bg-valorant-red px-6 py-4 font-bold text-white hover:shadow-neon disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isBusy}>{mode === "keyword" ? (isSearching ? "搜索中..." : "搜索视频") : (isSubmitting ? "提交中..." : "开始解析")}</button>
      </form>

      {mode === "keyword" && searchedKeyword && (
        <section className="rounded-3xl border border-white/10 bg-valorant-panel/70 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-valorant-red">video results</p>
              <h2 className="mt-2 text-2xl font-bold text-valorant-text">先选择要解析的视频</h2>
            </div>
            <p className="text-sm text-valorant-muted">关键词：{searchedKeyword}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {isSearching && <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-valorant-muted">正在搜索相关视频...</div>}
            {!isSearching && videoResults.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-valorant-muted">没有搜到可解析视频，请换一个关键词。</div>}
            {!isSearching && videoResults.map((video) => (
              <article key={video.url} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-valorant-red">
                    <span>{video.platform === "bilibili" ? "B站" : video.platform}</span>
                    {video.uploader && <span className="truncate text-valorant-muted">/ {video.uploader}</span>}
                  </div>
                  <h3 className="truncate text-lg font-bold text-valorant-text">{video.title || video.url}</h3>
                  <a className="mt-1 block truncate text-sm text-valorant-muted hover:text-valorant-red" href={video.url} target="_blank" rel="noreferrer">{video.url}</a>
                </div>
                <button type="button" onClick={() => void parseVideo(video)} disabled={isBusy} className="shrink-0 cursor-pointer rounded-xl border border-valorant-red px-5 py-3 text-sm font-bold text-valorant-red hover:bg-valorant-red hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {parsingUrl === video.url ? "提交中..." : "解析此视频"}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
