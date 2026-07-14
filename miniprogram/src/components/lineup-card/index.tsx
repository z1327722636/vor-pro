import Taro from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'

import { resolveAssetUrl } from '@/services/api'
import {
  getMapLabel, getAgentLabel, getAbilityLabel,
  getThrowLabel, getSideLabel,
} from '@/services/labels'
import type { Lineup } from '@/services/types'
import './index.css'

type Props = {
  lineup: Lineup
}

export function LineupCard({ lineup }: Props) {
  // Use steps first, fallback to standing/aim
  const firstStep = lineup.steps?.[0]
  const cover = resolveAssetUrl(firstStep?.image_path || lineup.standing_image_path || lineup.aim_image_path)
  const hasPreview = !!(lineup.aim_image_path || lineup.landing_image_path)

  return (
    <View
      className='lineup-card'
      onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${lineup.id}` })}
    >
      {/* Cover */}
      <View className='lineup-card__media'>
        {cover ? (
          <Image className='lineup-card__cover' mode='aspectFill' src={cover} />
        ) : (
          <View className='lineup-card__cover lineup-card__cover--empty'>
            <Text className='lineup-card__empty-icon'>🎯</Text>
          </View>
        )}
        {/* Overlay badges */}
        <View className='lineup-card__badges'>
          <View className='chip chip--primary'>{getMapLabel(lineup.map)}</View>
        </View>
      </View>

      {/* Body */}
      <View className='lineup-card__body'>
        <View className='lineup-card__row'>
          <View className='lineup-card__main'>
            <Text className='lineup-card__agent'>{getAgentLabel(lineup.agent)}</Text>
            <Text className='lineup-card__ability'>{getAbilityLabel(lineup.ability)}</Text>
          </View>
          <View className='lineup-card__site-badge'>
            <Text>{lineup.site.toUpperCase()}</Text>
          </View>
        </View>

        <View className='lineup-card__row lineup-card__row--sm'>
          <View className='chip chip--ghost'>{getThrowLabel(lineup.throw_type)}</View>
          <View className='chip chip--ghost'>{getSideLabel(lineup.side)}</View>
        </View>

        <View className='lineup-card__footer'>
          <View className='lineup-card__footer-left'>
            <Text className='lineup-card__likes'>♥ {lineup.likes_count}</Text>
          </View>
          <View className='lineup-card__footer-right'>
            {lineup.steps.length > 0 && (
              <Text className='lineup-card__steps'>{lineup.steps.length} 步骤</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}
