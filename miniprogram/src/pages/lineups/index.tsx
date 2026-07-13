import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { Button, View } from '@tarojs/components'
import { useState } from 'react'

import { FilterPanel } from '@/components/filter-panel'
import { LineupCard } from '@/components/lineup-card'
import { listLineups } from '@/services/lineups'
import type { Lineup, LineupFilters } from '@/services/types'
import './index.css'

const PAGE_SIZE = 20

export default function LineupsPage() {
  const [filters, setFilters] = useState<LineupFilters>({ sort: 'latest' })
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const load = async (reset = true) => {
    if (loading) return
    setLoading(true)
    try {
      const offset = reset ? 0 : lineups.length
      const data = await listLineups({ ...filters, limit: PAGE_SIZE, offset })
      setLineups(reset ? data : [...lineups, ...data])
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
      Taro.stopPullDownRefresh()
    }
  }

  useLoad(() => load(true))
  usePullDownRefresh(() => load(true))

  return (
    <View className='safe-page'>
      <View className='section-title'>点位库</View>
      <FilterPanel value={filters} onChange={setFilters} onSubmit={() => load(true)} />
      {lineups.map((lineup) => <LineupCard key={lineup.id} lineup={lineup} />)}
      {!loading && lineups.length === 0 ? <View className='lineups-empty'>暂无匹配点位</View> : null}
      {hasMore ? <Button className='lineups-more' loading={loading} onClick={() => load(false)}>加载更多</Button> : <View className='muted'>没有更多了</View>}
    </View>
  )
}
