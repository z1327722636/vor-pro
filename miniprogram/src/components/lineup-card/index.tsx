import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'

import { resolveAssetUrl } from '@/services/api'
import type { Lineup } from '@/services/types'
import './index.css'

type Props = {
  lineup: Lineup
}

const sideLabel: Record<string, string> = {
  attack: '进攻',
  defense: '防守'
}

export function LineupCard({ lineup }: Props) {
  const cover = resolveAssetUrl(lineup.steps?.[0]?.image_path || lineup.standing_image_path || lineup.aim_image_path)

  return (
    <View
      className='lineup-card'
      onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${lineup.id}` })}
    >
      {cover ? <Image className='lineup-card__cover' mode='aspectFill' src={cover} /> : <View className='lineup-card__placeholder'>暂无图片</View>}
      <View className='lineup-card__body'>
        <View className='lineup-card__title'>
          <Text>{lineup.map}</Text>
          <Text className='lineup-card__site'>{lineup.site.toUpperCase()}</Text>
        </View>
        <View className='lineup-card__meta'>
          <Text>{lineup.agent}</Text>
          <Text>{lineup.ability}</Text>
          <Text>{sideLabel[lineup.side] || lineup.side}</Text>
        </View>
        <View className='lineup-card__footer'>
          <Text>{lineup.throw_type}</Text>
          <Text>♥ {lineup.likes_count}</Text>
        </View>
      </View>
    </View>
  )
}
