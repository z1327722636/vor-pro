import type { Metadata } from "next";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valorant Lineup Hunter",
  description: "AI-assisted Valorant lineup knowledge base"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans antialiased">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-valorant-ink/80 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="text-lg font-extrabold tracking-[0.18em] text-valorant-text">
              VOR HUNTER
            </Link>
            <div className="flex items-center gap-5 text-sm text-valorant-muted">
              <Link className="hover:text-valorant-red" href="/lineups">Lineups</Link>
              <Link className="hover:text-valorant-red" href="/jobs/new">AI 解析</Link>
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
