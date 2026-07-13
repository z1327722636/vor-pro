import Taro from '@tarojs/taro'
import { Button, View } from '@tarojs/components'
import type { ReactNode } from 'react'

import { useAuthStore } from '@/store/auth-store'
import './index.css'

type Props = {
  children: ReactNode
}

export function LoginGuard({ children }: Props) {
  const token = useAuthStore((state) => state.token)
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)

  if (token) {
    return <>{children}</>
  }

  const handleLogin = async () => {
    try {
      await login()
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
    }
  }

  return (
    <View className='login-guard'>
      <Button className='login-guard__button' loading={loading} onClick={handleLogin}>微信登录后继续</Button>
    </View>
  )
}
