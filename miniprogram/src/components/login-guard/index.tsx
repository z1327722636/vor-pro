import Taro from '@tarojs/taro'
import { Button, View } from '@tarojs/components'
import { useState, type ReactNode } from 'react'

import { EmailLoginForm } from '@/components/email-login-form'
import { useAuthStore } from '@/store/auth-store'
import './index.css'

type Props = {
  children: ReactNode
  compact?: boolean
  onLoginSuccess?: () => Promise<void> | void
}

export function LoginGuard({ children, compact = false, onLoginSuccess }: Props) {
  const token = useAuthStore((state) => state.token)
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const [showEmailLogin, setShowEmailLogin] = useState(false)

  if (token) {
    return <>{children}</>
  }

  const handleLogin = async () => {
    try {
      await login()
      await onLoginSuccess?.()
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
    }
  }

  if (compact) {
    return (
      <View className='login-guard login-guard--compact'>
        <View className='login-guard__compact-row'>
          <View className='login-guard__compact-copy'>登录后可互动</View>
          <Button className='login-guard__button login-guard__button--compact' loading={loading} onClick={handleLogin}>
            微信登录
          </Button>
          <View className='login-guard__compact-link' onClick={() => setShowEmailLogin((value) => !value)}>
            {showEmailLogin ? '收起' : '邮箱登录'}
          </View>
        </View>
        {showEmailLogin ? <EmailLoginForm compact onSuccess={onLoginSuccess} /> : null}
      </View>
    )
  }

  return (
    <View className='login-guard'>
      <View className='login-guard__icon'>
        <View className='login-guard__lock'>🔒</View>
      </View>
      <View className='login-guard__text'>登录后才能进行互动</View>
      <Button className='login-guard__button' loading={loading} onClick={handleLogin}>
        微信一键登录
      </Button>
      <View className='login-guard__divider'>或使用邮箱登录</View>
      <EmailLoginForm onSuccess={onLoginSuccess} />
    </View>
  )
}
