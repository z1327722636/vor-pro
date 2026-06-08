export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type LineupStep = {
  id?: number | null;
  title: string;
  image_path?: string | null;
  note: string;
  order_index: number;
};

export type CurrentUser = {
  id: number;
  email: string;
  is_admin: boolean;
};

export type Lineup = {
  id: number;
  map: string;
  agent: string;
  side: string;
  ability: string;
  throw_type: string;
  site?: string;
  source_type: string;
  standing_description: string;
  aim_description: string;
  landing_description: string;
  standing_image_path?: string | null;
  aim_image_path?: string | null;
  landing_image_path?: string | null;
  steps?: LineupStep[];
  corrected_from_id?: number | null;
  original_video_url?: string | null;
  original_video_timestamp_ms?: number | null;
  likes_count: number;
  reports_count: number;
  is_hidden: boolean;
  created_at: string;
};

export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    console.error("API request failed", response.status, path);
  }
  return response.json() as Promise<T>;
}
