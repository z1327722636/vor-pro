import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { Text, View } from '@tarojs/components'
import { useState } from 'react'

import { NativePicker } from '@/components/native-picker'
import { LineupCard } from '@/components/lineup-card'
import { listLineups } from '@/services/lineups'
import { agentOptions, mapOptions } from '@/services/labels'
import type { Lineup, LineupFilters } from '@/services/types'
import './index.css'

const QUICK_LIMIT = 8
const mapFilterOptions = [{ value: '', label: '全部地图' }, ...mapOptions]
const agentFilterOptions = [{ value: '', label: '全部英雄' }, ...agentOptions]

export default function HomePage() {
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAgent, setActiveAgent] = useState('')
  const [activeMap, setActiveMap] = useState('')

  const loadWith = async (map = activeMap, agent = activeAgent) => {
    setLoading(true)
    try {
      const filters: LineupFilters = { limit: QUICK_LIMIT, sort: 'latest' }
      if (agent) filters.agent = agent
      if (map) filters.map = map
      setLineups(await listLineups(filters))
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useDidShow(() => { loadWith() })
  usePullDownRefresh(() => loadWith())

  const updateMap = (value: string) => {
    setActiveMap(value)
    loadWith(value, activeAgent)
  }

  const updateAgent = (value: string) => {
    setActiveAgent(value)
    loadWith(activeMap, value)
  }

  const clearFilters = () => {
    setActiveAgent('')
    setActiveMap('')
    loadWith('', '')
  }

  const hasFilter = Boolean(activeAgent || activeMap)

  return (
    <View className='safe-page home-page'>
      <View className='home-hero'>
        <View className='home-hero__eyebrow'>手动沉淀每一个可复用点位</View>
        <Text className='home-hero__title'>VOR Lineup</Text>
        <Text className='home-hero__desc'>浏览、投稿、手动标帧和手动矫正都可以在小程序完成。</Text>
        <View className='home-hero__actions'>
          <View className='home-hero__btn home-hero__btn--primary' onClick={() => Taro.navigateTo({ url: '/pages/contribute/index' })}>
            <Text>投稿点位</Text>
          </View>
          <View className='home-hero__btn' onClick={() => Taro.switchTab({ url: '/pages/lineups/index' })}>
            <Text>浏览点位库</Text>
          </View>
        </View>
      </View>

      <View className='home-filter-card'>
        <View className='home-filter-card__head'>
          <Text className='home-filter-card__title'>快速筛选</Text>
          {hasFilter ? <Text className='home-filter-card__clear' onClick={clearFilters}>清空</Text> : null}
        </View>
        <View className='home-filter-card__grid'>
          <NativePicker label='地图' value={activeMap} options={mapFilterOptions} onChange={updateMap} />
          <NativePicker label='英雄' value={activeAgent} options={agentFilterOptions} onChange={updateAgent} />
        </View>
      </View>

      <View className='home-workflow'>
        {['选图或视频', '手动标注信息', '保存到点位库'].map((item, index) => (
          <View key={item} className='home-workflow__item'>
            <Text className='home-workflow__num'>{index + 1}</Text>
            <Text className='home-workflow__text'>{item}</Text>
          </View>
        ))}
      </View>

      <View className='section-title'>
        <Text>{hasFilter ? '筛选结果' : '最新点位'}</Text>
        <Text className='section-title__extra' onClick={() => Taro.switchTab({ url: '/pages/lineups/index' })}>更多</Text>
      </View>

      {loading ? (
        <View>
          {[1, 2, 3].map((i) => (
            <View key={i} className='skeleton-card'>
              <View className='skeleton-card__image' />
              <View className='skeleton-card__line skeleton-card__line--w60' />
              <View className='skeleton-card__line skeleton-card__line--w80' />
            </View>
          ))}
        </View>
      ) : lineups.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-state__text'>暂无匹配点位</Text>
        </View>
      ) : (
        <View>
          {lineups.map((lineup) => <LineupCard key={lineup.id} lineup={lineup} />)}
        </View>
      )}
    </View>
  )
}
