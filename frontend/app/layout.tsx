import type { Metadata } from "next";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "无畏点位猎手｜战术点位知识库",
  description: "面向无畏契约玩家的战术点位知识库"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans antialiased">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-valorant-ink/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
            <Link href="/" className="shrink-0 whitespace-nowrap text-sm font-extrabold tracking-[0.14em] text-valorant-text sm:text-lg sm:tracking-[0.18em]">
              VOR HUNTER
            </Link>
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] text-valorant-muted sm:gap-5 sm:text-sm">
              <Link className="hover:text-valorant-red" href="/lineups">Lineups</Link>
              <Link className="hover:text-valorant-red" href="/contribute/upload">投稿</Link>
              <AuthNav />
            </div>
          </nav>
        </header>
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
