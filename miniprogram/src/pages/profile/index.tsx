import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { useState } from 'react'

import { EmailLoginForm } from '@/components/email-login-form'
import { LineupCard } from '@/components/lineup-card'
import { useAuthStore } from '@/store/auth-store'
import { deleteMyLineup, listMyLineups, updateMyLineupVisibility } from '@/services/lineups'
import type { Lineup } from '@/services/types'
import './index.css'

export default function ProfilePage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  const [mine, setMine] = useState<Lineup[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const loadData = async () => {
    if (!useAuthStore.getState().token) {
      setMine([])
      return
    }
    setLoadingData(true)
    try {
      setMine(await listMyLineups({ sort: 'latest', limit: 100 }))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载投稿失败', icon: 'none' })
    } finally {
      setLoadingData(false)
    }
  }

  useDidShow(() => {
    refreshProfile().then(loadData)
  })

  const handleLogin = async () => {
    try {
      await login()
      await loadData()
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' })
    }
  }

  const toggleHidden = async (lineup: Lineup) => {
    try {
      const updated = await updateMyLineupVisibility(lineup.id, !lineup.is_hidden)
      setMine((current) => current.map((item) => item.id === lineup.id ? updated : item))
      Taro.showToast({ title: updated.is_hidden ? '已隐藏' : '已公开', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    }
  }

  const removeLineup = async (lineup: Lineup) => {
    const confirmed = await Taro.showModal({ title: '删除投稿', content: `确定删除 #${lineup.id} 吗？`, confirmColor: '#ff4655' })
    if (!confirmed.confirm) return
    try {
      await deleteMyLineup(lineup.id)
      setMine((current) => current.filter((item) => item.id !== lineup.id))
      Taro.showToast({ title: '已删除', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    }
  }

  return (
    <View className='safe-page profile-page'>
      <View className='profile-card'>
        <View className='profile-card__avatar'><Text>{user ? (user.email?.[0] || 'U').toUpperCase() : '?'}</Text></View>
        {token ? (
          <>
            <Text className='profile-card__name'>{user?.email || '用户'}</Text>
            <Text className='profile-card__role'>{user?.is_admin ? '管理员' : '普通用户'}</Text>
            <View className='profile-card__stats'>
              <View className='profile-card__stat'><Text className='profile-card__stat-num'>{mine.length}</Text><Text className='profile-card__stat-label'>投稿</Text></View>
              <View className='profile-card__stat'><Text className='profile-card__stat-num'>{mine.filter((item) => !item.is_hidden).length}</Text><Text className='profile-card__stat-label'>公开</Text></View>
              <View className='profile-card__stat'><Text className='profile-card__stat-num'>{mine.filter((item) => item.is_hidden).length}</Text><Text className='profile-card__stat-label'>隐藏</Text></View>
            </View>
            <View className='profile-card__actions'>
              <Button className='profile-card__primary' onClick={() => Taro.navigateTo({ url: '/pages/contribute/index' })}>去投稿</Button>
              <Button className='profile-card__logout' onClick={logout}>退出</Button>
            </View>
          </>
        ) : (
          <>
            <Text className='profile-card__name'>未登录</Text>
            <Text className='profile-card__desc'>登录后可投稿、点赞、收藏和管理自己的点位。</Text>
            <Button className='profile-card__login' loading={loading} onClick={handleLogin}>微信一键登录</Button>
            <Text className='profile-card__login-divider'>或使用邮箱登录</Text>
            <EmailLoginForm onSuccess={loadData} />
          </>
        )}
      </View>

      {token ? (
        <>
          <View className='section-title'>
            <Text>我的投稿</Text>
            <Text className='section-title__extra' onClick={loadData}>刷新</Text>
          </View>
          {loadingData ? (
            <View className='skeleton-card'><View className='skeleton-card__line skeleton-card__line--w80' /></View>
          ) : mine.length > 0 ? (
            <View className='mine-list'>
              {mine.map((lineup) => (
                <View key={lineup.id} className='mine-item'>
                  <LineupCard lineup={lineup} />
                  <View className='mine-item__actions'>
                    <Text className='mine-item__status'>{lineup.is_hidden ? '已隐藏' : '公开中'}</Text>
                    <Text onClick={() => toggleHidden(lineup)}>{lineup.is_hidden ? '设为公开' : '隐藏'}</Text>
                    <Text onClick={() => removeLineup(lineup)}>删除</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='empty-state' style={{ padding: '40px 0' }}>
              <Text className='empty-state__text'>还没有投稿</Text>
              <Button className='profile-card__primary profile-card__primary--wide' onClick={() => Taro.navigateTo({ url: '/pages/contribute/index' })}>马上投稿</Button>
            </View>
          )}
        </>
      ) : null}

      <View className='section-title'>关于</View>
      <View className='about-card'>
        <Text className='about-card__title'>VOR · Valorant Lineup Hunter</Text>
        <Text className='about-card__text'>小程序端已支持浏览、完整筛选、手动传图投稿、视频手动标帧、手动矫正和投稿管理。</Text>
        <Text className='about-card__text'>当前不提供自动 AI 识别入口，所有标注和解析都以人工选择为准。</Text>
      </View>
    </View>
  )
}
