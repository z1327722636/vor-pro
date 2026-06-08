"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL, type CurrentUser } from "@/lib/api";
import { clearToken, getToken, setLoginRedirect } from "@/lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const token = getToken();
      if (!token) {
        setLoginRedirect("/account");
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });

        if (response.status === 401) {
          clearToken();
          setLoginRedirect("/account");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("load user failed");
        }

        if (!cancelled) setUser((await response.json()) as CurrentUser);
      } catch {
        if (!cancelled) setError("账号信息加载失败，请稍后重试。");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/");
  }

  if (isLoading) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center px-6 py-12">
      <section className="w-full rounded-3xl border border-white/10 bg-valorant-panel/90 p-8 shadow-2xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-valorant-panel2 to-valorant-navy text-xl font-extrabold text-valorant-text shadow-blueNeon">
              V
            </div>
            <div>
              <p className="text-sm text-valorant-muted">账号管理</p>
              <h1 className="text-2xl font-bold text-valorant-text">{user?.email ?? "已登录用户"}</h1>
              {user ? <p className="mt-1 text-xs text-valorant-muted">用户 ID：{user.id}{user.is_admin ? " · 管理员" : ""}</p> : null}
            </div>
          </div>
          <button type="button" onClick={logout} className="cursor-pointer rounded-xl border border-white/10 px-5 py-3 font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red">
            退出登录
          </button>
        </div>

        {error ? <p className="mt-6 rounded-xl border border-valorant-red/40 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-text">{error}</p> : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red" href="/lineups">
            阵容库
          </Link>
          <Link className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red" href="/account/lineups">
            投稿管理
          </Link>
          <Link className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-valorant-text hover:border-valorant-red hover:text-valorant-red" href="/contribute/upload">
            上传投稿
          </Link>
          {user?.is_admin ? (
            <Link className="rounded-xl border border-valorant-red/40 px-5 py-3 text-sm font-bold text-valorant-red hover:bg-valorant-red hover:text-white" href="/admin/lineups">
              Lineup 管理
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
