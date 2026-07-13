import Taro, { useLoad } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { useState } from 'react'

import { LineupCard } from '@/components/lineup-card'
import { listLineups } from '@/services/lineups'
import type { Lineup } from '@/services/types'
import './index.css'

export default function HomePage() {
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setLineups(await listLineups({ limit: 6, sort: 'latest' }))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useLoad(load)

  return (
    <View className='safe-page home-page'>
      <View className='home-hero'>
        <Text className='home-hero__eyebrow'>Valorant Lineup Hunter</Text>
        <Text className='home-hero__title'>随时查点位，开局少背锅</Text>
        <Text className='home-hero__desc'>小程序端优先承接移动浏览、筛选、详情、点赞和收藏；PC 端继续负责投稿、视频解析和管理。</Text>
        <Button className='home-hero__button' onClick={() => Taro.switchTab({ url: '/pages/lineups/index' })}>开始查点位</Button>
      </View>

      <View className='section-title'>最新点位</View>
      {loading ? <View className='muted'>加载中...</View> : lineups.map((lineup) => <LineupCard key={lineup.id} lineup={lineup} />)}
    </View>
  )
}
