import Taro, { useLoad } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'

import { useAuthStore } from '@/store/auth-store'
import './index.css'

export default function ProfilePage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  useLoad(refreshProfile)

  const handleLogin = async () => {
    try {
      await login()
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
    }
  }

  return (
    <View className='safe-page profile-page'>
      <View className='profile-card'>
        <Text className='profile-card__title'>{token ? '已登录' : '未登录'}</Text>
        <Text className='profile-card__desc'>{user ? user.email : '登录后可点赞、收藏点位。投稿和视频解析仍建议在 PC 端完成。'}</Text>
        {token ? <Button className='profile-card__button profile-card__button--ghost' onClick={logout}>退出登录</Button> : <Button className='profile-card__button' loading={loading} onClick={handleLogin}>微信一键登录</Button>}
      </View>

      <View className='profile-panel'>
        <Text className='profile-panel__title'>双端分工</Text>
        <Text className='profile-panel__item'>小程序：浏览、筛选、详情、点赞、收藏。</Text>
        <Text className='profile-panel__item'>PC：投稿上传、视频解析、图片标注、后台管理。</Text>
      </View>
    </View>
  )
}
