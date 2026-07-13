import Taro from '@tarojs/taro'

export const TOKEN_STORAGE_KEY = 'vor_access_token'

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api'

export function getApiBaseUrl(): string {
  return (process.env.TARO_APP_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

export function resolveAssetUrl(path?: string | null): string {
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const apiBase = getApiBaseUrl().replace(/\/api$/, '')
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
}

export function getStoredToken(): string {
  return Taro.getStorageSync<string>(TOKEN_STORAGE_KEY) || ''
}

export function setStoredToken(token: string): void {
  if (token) {
    Taro.setStorageSync(TOKEN_STORAGE_KEY, token)
  } else {
    Taro.removeStorageSync(TOKEN_STORAGE_KEY)
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  data?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await Taro.request<T>({
    url: `${getApiBaseUrl()}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: headers
  })

  if (response.statusCode === 401) {
    setStoredToken('')
    throw new Error('登录已过期，请重新登录')
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const data = response.data as { detail?: string } | string
    const message = typeof data === 'object' && data?.detail ? data.detail : `请求失败：${response.statusCode}`
    throw new Error(message)
  }

  return response.data
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return search ? `?${search}` : ''
}
