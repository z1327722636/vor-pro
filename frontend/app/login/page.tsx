"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { consumeLoginRedirect, getToken, setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) {
      router.replace(consumeLoginRedirect() as Route);
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        setError(response.status === 401 ? "邮箱或密码错误" : `登录失败（HTTP ${response.status}）`);
        return;
      }
      const data = await response.json();
      setToken(data.access_token);
      router.push(consumeLoginRedirect() as Route);
    } catch (error) {
      setError(`无法连接后端：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (isCheckingAuth) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-white/10 bg-valorant-panel/90 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-valorant-text">登录</h1>
        <input className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="请输入邮箱" />
        <input className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-valorant-red" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="至少 8 位密码" />
        {error ? <p className="rounded-xl border border-valorant-red/30 bg-valorant-red/10 px-4 py-3 text-sm text-valorant-red">{error}</p> : null}
        <button className="cursor-pointer rounded-xl bg-valorant-red px-5 py-3 font-bold text-white hover:shadow-neon" type="submit">进入控制台</button>
        <Link href="/register" className="text-sm text-valorant-muted hover:text-valorant-blue">还没有账号？去注册</Link>
      </form>
    </div>
  );
}
