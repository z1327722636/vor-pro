import Taro from '@tarojs/taro'

import { apiRequest, setStoredToken } from './api'
import type { TokenResponse, UserProfile } from './types'

export async function loginWithWechat(): Promise<TokenResponse> {
  const loginResult = await Taro.login()
  if (!loginResult.code) {
    throw new Error('微信登录未返回 code')
  }

  const token = await apiRequest<TokenResponse>('/auth/wechat-login', {
    method: 'POST',
    data: { code: loginResult.code },
    auth: false
  })
  setStoredToken(token.access_token)
  return token
}

export function logout(): void {
  setStoredToken('')
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/me')
}
