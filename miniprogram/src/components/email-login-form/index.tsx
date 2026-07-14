import Taro from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { useState } from 'react'

import { useAuthStore } from '@/store/auth-store'
import './index.css'

type Props = {
  buttonText?: string
  compact?: boolean
  onSuccess?: () => Promise<void> | void
}

export function EmailLoginForm({ buttonText = '邮箱登录', compact = false, onSuccess }: Props) {
  const loading = useAuthStore((state) => state.loading)
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      Taro.showToast({ title: '请输入邮箱和密码', icon: 'none' })
      return
    }

    try {
      await loginWithEmail(trimmedEmail, password)
      await onSuccess?.()
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
    }
  }

  return (
    <View className={`email-login-form ${compact ? 'email-login-form--compact' : ''}`}>
      <Text className='email-login-form__title'>邮箱账号登录</Text>
      <Input
        className='email-login-form__input'
        value={email}
        type='text'
        placeholder='请输入邮箱'
        onInput={(event) => setEmail(event.detail.value)}
      />
      <Input
        className='email-login-form__input'
        value={password}
        password
        placeholder='请输入密码'
        onInput={(event) => setPassword(event.detail.value)}
      />
      <Button className='email-login-form__button' loading={loading} disabled={loading} onClick={handleLogin}>
        {buttonText}
      </Button>
    </View>
  )
}
