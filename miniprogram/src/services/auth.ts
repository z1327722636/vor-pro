import Taro from '@tarojs/taro'

import { apiRequest, setStoredToken } from './api'
import type { TokenResponse, UserProfile } from './types'

type WechatLinkCredentials = {
  email: string
  password: string
}

export async function loginWithWechat(link?: WechatLinkCredentials): Promise<TokenResponse> {
  const loginResult = await Taro.login()
  if (!loginResult.code) {
    throw new Error('微信登录未返回 code')
  }

  const token = await apiRequest<TokenResponse>('/auth/wechat-login', {
    method: 'POST',
    data: link
      ? { code: loginResult.code, link_email: link.email, link_password: link.password }
      : { code: loginResult.code },
    auth: false
  })
  setStoredToken(token.access_token)
  return token
}

export async function loginWithEmail(email: string, password: string): Promise<TokenResponse> {
  const token = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    data: { email, password },
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
