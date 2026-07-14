import Taro, { useLoad, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { Button, Input, Text, View } from '@tarojs/components'
import { useRef, useState } from 'react'

import { NativePicker } from '@/components/native-picker'
import { LineupCard } from '@/components/lineup-card'
import { listLineups } from '@/services/lineups'
import {
  abilityOptions,
  agentAbilityMap,
  agentOptions,
  mapOptions,
  sideOptions,
  siteOptions,
  sourceOptions,
  throwOptions,
} from '@/services/labels'
import type { LabelOption } from '@/services/labels'
import type { Lineup, LineupFilters } from '@/services/types'
import './index.css'

const PAGE_SIZE = 20
const withAll = (label: string, options: LabelOption[]) => [{ value: '', label }, ...options]
const mapFilterOptions = withAll('全部地图', mapOptions)
const siteFilterOptions = withAll('全部点位', siteOptions)
const sideFilterOptions = withAll('全部阵营', sideOptions)
const agentFilterOptions = withAll('全部英雄', agentOptions)
const throwFilterOptions = withAll('全部投掷', throwOptions)
const sourceFilterOptions = withAll('全部来源', sourceOptions)
const sortFilterOptions = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '点赞最多' },
]

function cleanFilters(filters: LineupFilters): LineupFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  ) as LineupFilters
}

export default function LineupsPage() {
  const [filters, setFilters] = useState<LineupFilters>({ sort: 'latest' })
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const loadingRef = useRef(false)

  const load = async (reset = true, nextFilters = filters, nextSearch = search) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const params: LineupFilters = {
        ...cleanFilters(nextFilters),
        q: nextSearch.trim() || undefined,
        sort: nextFilters.sort || 'latest',
        limit: PAGE_SIZE,
        offset: reset ? 0 : lineups.length,
      }
      const data = await listLineups(params)
      setLineups((current) => (reset ? data : [...current, ...data]))
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
      loadingRef.current = false
      Taro.stopPullDownRefresh()
    }
  }

  useLoad(() => load(true))
  usePullDownRefresh(() => load(true))
  useReachBottom(() => {
    if (!loading && hasMore) load(false)
  })

  const applyFilters = (next: LineupFilters, nextSearch = search) => {
    const cleaned = cleanFilters(next)
    setFilters(cleaned)
    setLineups([])
    setHasMore(true)
    load(true, cleaned, nextSearch)
  }

  const updateFilter = (key: keyof LineupFilters, value: string) => {
    const next: LineupFilters = { ...filters, [key]: value || undefined }
    if (key === 'agent') {
      const nextAbilityOptions = value ? agentAbilityMap[value] || [] : abilityOptions
      if (next.ability && !nextAbilityOptions.some((item) => item.value === next.ability)) {
        next.ability = undefined
      }
    }
    if (key === 'sort' && !value) next.sort = 'latest'
    applyFilters(next)
  }

  const submitSearch = () => {
    setLineups([])
    setHasMore(true)
    load(true, filters, search)
  }

  const resetFilters = () => {
    setSearch('')
    applyFilters({ sort: 'latest' }, '')
  }

  const abilityFilterOptions = withAll(
    filters.agent ? '全部技能' : '全部技能',
    filters.agent ? (agentAbilityMap[filters.agent] || []) : abilityOptions
  )
  const activeCount = ['map', 'site', 'side', 'agent', 'ability', 'throw_type', 'source_type']
    .filter((key) => Boolean(filters[key as keyof LineupFilters])).length + (search.trim() ? 1 : 0)

  return (
    <View className='safe-page lineups-page'>
      <View className='lineups-header'>
        <View>
          <Text className='lineups-header__title'>点位库</Text>
          <Text className='lineups-header__desc'>地图、点位、英雄、技能、来源都用原生选择器筛。</Text>
        </View>
        <View className='lineups-header__submit' onClick={() => Taro.navigateTo({ url: '/pages/contribute/index' })}>
          <Text>投稿</Text>
        </View>
      </View>

      <View className='lineups-filter-card'>
        <View className='search-bar'>
          <Input
            className='search-bar__input'
            placeholder='搜索地图、英雄、技能或描述'
            placeholderClass='search-bar__placeholder'
            value={search}
            confirmType='search'
            onInput={(event) => setSearch(event.detail.value)}
            onConfirm={submitSearch}
          />
          <Button className='search-bar__button' onClick={submitSearch}>搜索</Button>
        </View>

        <View className='filter-grid'>
          <NativePicker label='地图' value={filters.map} options={mapFilterOptions} onChange={(value) => updateFilter('map', value)} />
          <NativePicker label='点位' value={filters.site} options={siteFilterOptions} onChange={(value) => updateFilter('site', value)} />
          <NativePicker label='阵营' value={filters.side} options={sideFilterOptions} onChange={(value) => updateFilter('side', value)} />
          <NativePicker label='英雄' value={filters.agent} options={agentFilterOptions} onChange={(value) => updateFilter('agent', value)} />
          <NativePicker label='技能' value={filters.ability} options={abilityFilterOptions} onChange={(value) => updateFilter('ability', value)} />
          <NativePicker label='投掷' value={filters.throw_type} options={throwFilterOptions} onChange={(value) => updateFilter('throw_type', value)} />
          <NativePicker label='来源' value={filters.source_type} options={sourceFilterOptions} onChange={(value) => updateFilter('source_type', value)} />
          <NativePicker label='排序' value={filters.sort || 'latest'} options={sortFilterOptions} onChange={(value) => updateFilter('sort', value)} />
        </View>

        {activeCount > 0 ? (
          <View className='filter-summary'>
            <Text>已启用 {activeCount} 个筛选条件</Text>
            <Text className='filter-summary__clear' onClick={resetFilters}>清空</Text>
          </View>
        ) : null}
      </View>

      {loading && lineups.length === 0 ? (
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
          <Text className='empty-state__text'>暂无匹配点位，换个条件试试</Text>
        </View>
      ) : (
        <View>
          {lineups.map((lineup) => <LineupCard key={lineup.id} lineup={lineup} />)}
          {loading ? <View className='load-more-hint'><Text>加载中...</Text></View> : null}
          {!hasMore && lineups.length > 0 ? <View className='load-more-hint'><Text>已经到底了</Text></View> : null}
        </View>
      )}
    </View>
  )
}
