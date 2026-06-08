"use client";

import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

type JobProgress = {
  status?: string;
  progress?: number;
  error_message?: string | null;
};

export function ProgressStream({ jobId }: { jobId: number }) {
  const wsUrl = API_BASE_URL.replace(/^http/, "ws") + `/api/ws/jobs/${jobId}`;
  const { lastJsonMessage } = useWebSocket(wsUrl, { shouldReconnect: () => true });
  const [polledMessage, setPolledMessage] = useState<JobProgress | null>(null);
  const message = (lastJsonMessage as JobProgress | null) ?? polledMessage;
  const progress = Math.round((message?.progress ?? 0) * 100);

  useEffect(() => {
    let cancelled = false;

    async function pollJob() {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (!response.ok || cancelled) return;
      const data = await response.json() as JobProgress;
      setPolledMessage(data);
    }

    void pollJob();
    const timer = window.setInterval(() => void pollJob(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-valorant-panel p-5">
      <div className="mb-3 flex justify-between text-sm text-valorant-muted">
        <span>{message?.status ?? "读取任务状态中"}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/40">
        <div className="h-full bg-valorant-red transition-all" style={{ width: `${progress}%` }} />
      </div>
      {message?.error_message && <p className="mt-3 text-sm text-valorant-red">{message.error_message}</p>}
    </div>
  );
}
