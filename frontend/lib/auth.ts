const TOKEN_KEY = "vor_access_token";
const LOGIN_REDIRECT_KEY = "vor_login_redirect";
export const AUTH_CHANGE_EVENT = "vor_auth_change";

function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChange();
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

export function setLoginRedirect(path: string): void {
  if (typeof window === "undefined" || !isSafeRedirectPath(path)) return;
  window.sessionStorage.setItem(LOGIN_REDIRECT_KEY, path);
}

export function consumeLoginRedirect(fallback = "/lineups"): string {
  if (typeof window === "undefined") return fallback;
  const path = window.sessionStorage.getItem(LOGIN_REDIRECT_KEY);
  window.sessionStorage.removeItem(LOGIN_REDIRECT_KEY);
  return path && isSafeRedirectPath(path) ? path : fallback;
}
