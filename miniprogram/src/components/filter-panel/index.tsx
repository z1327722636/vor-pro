import { Button, Picker, Text, View } from '@tarojs/components'

import type { LineupFilters } from '@/services/types'
import './index.css'

const maps = ['', 'ascent', 'bind', 'haven', 'split', 'icebox', 'lotus', 'sunset', 'breeze', 'fracture', 'pearl', 'abyss']
const sides = ['', 'attack', 'defense']
const agents = ['', 'sova', 'viper', 'brimstone', 'killjoy', 'cypher', 'jett', 'raze', 'omen', 'sage']

const labelMap: Record<string, string> = {
  '': '全部',
  attack: '进攻',
  defense: '防守'
}

type Props = {
  value: LineupFilters
  onChange: (next: LineupFilters) => void
  onSubmit: () => void
}

function pickValue(list: string[], index: number): string | undefined {
  return list[index] || undefined
}

export function FilterPanel({ value, onChange, onSubmit }: Props) {
  return (
    <View className='filter-panel'>
      <View className='filter-panel__row'>
        <Picker mode='selector' range={maps.map((item) => item || '全部地图')} onChange={(event) => onChange({ ...value, map: pickValue(maps, Number(event.detail.value)) })}>
          <View className='filter-panel__chip'>地图：<Text>{value.map || '全部'}</Text></View>
        </Picker>
        <Picker mode='selector' range={agents.map((item) => item || '全部特工')} onChange={(event) => onChange({ ...value, agent: pickValue(agents, Number(event.detail.value)) })}>
          <View className='filter-panel__chip'>特工：<Text>{value.agent || '全部'}</Text></View>
        </Picker>
      </View>
      <View className='filter-panel__row'>
        <Picker mode='selector' range={sides.map((item) => labelMap[item] || item)} onChange={(event) => onChange({ ...value, side: pickValue(sides, Number(event.detail.value)) })}>
          <View className='filter-panel__chip'>阵营：<Text>{labelMap[value.side || ''] || value.side}</Text></View>
        </Picker>
        <Button className='filter-panel__button' size='mini' onClick={onSubmit}>查询</Button>
      </View>
    </View>
  )
}
