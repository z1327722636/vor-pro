"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, type CurrentUser } from "@/lib/api";
import { AUTH_CHANGE_EVENT, clearToken, getToken } from "@/lib/auth";

export function AuthNav() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setIsOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 180);
  }

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setIsAuthed(false);
          setUser(null);
          setIsOpen(false);
        }
        return;
      }

      if (!cancelled) setIsAuthed(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });

        if (response.status === 401) {
          clearToken();
          return;
        }

        if (response.ok && !cancelled) {
          setUser((await response.json()) as CurrentUser);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    syncAuth();
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function logout() {
    clearToken();
    setIsOpen(false);
    router.push("/");
    router.refresh();
  }

  if (isAuthed === null) {
    return <div className="h-9 w-[88px]" aria-hidden="true" />;
  }

  if (isAuthed) {
    return (
      <div
        ref={containerRef}
        className="relative"
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") openMenu();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") scheduleClose();
        }}
        onFocus={openMenu}
        onBlur={(event) => {
          const nextFocus = event.relatedTarget;
          if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) scheduleClose();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <button
          type="button"
          aria-label="用户菜单"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={openMenu}
          className="group flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-valorant-panel2 to-valorant-navy text-valorant-text shadow-blueNeon transition duration-150 hover:border-valorant-red hover:shadow-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-valorant-red/70"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold transition group-hover:bg-valorant-red/20">V</span>
        </button>

        {isOpen ? (
          <div className="absolute right-0 top-9 z-50 w-64 pt-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-valorant-panel/95 text-sm text-valorant-text shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-1 duration-150" role="menu">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs text-valorant-muted">当前账号</p>
                <p className="truncate font-semibold">{user?.email ?? "已登录用户"}</p>
              </div>
              <Link className="block px-4 py-3 text-valorant-muted transition hover:bg-white/5 hover:text-valorant-red" href="/account" onClick={() => setIsOpen(false)} role="menuitem">
                账号管理
              </Link>
              <Link className="block px-4 py-3 text-valorant-muted transition hover:bg-white/5 hover:text-valorant-red" href="/account/lineups" onClick={() => setIsOpen(false)} role="menuitem">
                投稿管理
              </Link>
              {user?.is_admin ? (
                <Link className="block px-4 py-3 text-valorant-muted transition hover:bg-white/5 hover:text-valorant-red" href="/admin/lineups" onClick={() => setIsOpen(false)} role="menuitem">
                  Lineup 管理
                </Link>
              ) : null}
              <button type="button" className="w-full cursor-pointer px-4 py-3 text-left text-valorant-muted transition hover:bg-white/5 hover:text-valorant-red" onClick={logout} role="menuitem">
                退出登录
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link className="hover:text-valorant-red" href="/login">登录</Link>
      <span className="text-white/25">/</span>
      <Link className="hover:text-valorant-red" href="/register">注册</Link>
    </div>
  );
}
