import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import { useState } from 'react'

import { LoginGuard } from '@/components/login-guard'
import { resolveAssetUrl } from '@/services/api'
import { getLineup } from '@/services/lineups'
import { favoriteLineup, likeLineup, unfavoriteLineup, unlikeLineup } from '@/services/social'
import {
  getAbilityLabel,
  getAgentLabel,
  getMapLabel,
  getSideLabel,
  getSiteLabel,
  getSourceLabel,
  getThrowLabel,
} from '@/services/labels'
import type { Lineup, LineupStep } from '@/services/types'
import './index.css'

function getSteps(lineup: Lineup): LineupStep[] {
  if (lineup.steps?.length) return lineup.steps
  return [
    { title: '站位', image_path: lineup.standing_image_path, note: lineup.standing_description, order_index: 0 },
    { title: '瞄准', image_path: lineup.aim_image_path, note: lineup.aim_description, order_index: 1 },
    { title: '落点', image_path: lineup.landing_image_path, note: lineup.landing_description, order_index: 2 },
  ].filter((item) => item.image_path || item.note)
}

export default function DetailPage() {
  const router = useRouter()
  const id = Number(router.params.id)
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const load = async () => {
    if (!id) return
    try {
      const data = await getLineup(id)
      setLineup(data)
      setLiked(data.is_liked)
      setFavorited(data.is_favorited)
      setCurrentStep(0)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
    }
  }

  useLoad(load)

  const toggleLike = async () => {
    if (!lineup || busy) return
    setBusy(true)
    try {
      if (liked) {
        await unlikeLineup(lineup.id)
        setLiked(false)
        setLineup({ ...lineup, likes_count: Math.max(0, lineup.likes_count - 1) })
      } else {
        await likeLineup(lineup.id)
        setLiked(true)
        setLineup({ ...lineup, likes_count: lineup.likes_count + 1 })
      }
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  const toggleFavorite = async () => {
    if (!lineup || busy) return
    setBusy(true)
    try {
      if (favorited) {
        await unfavoriteLineup(lineup.id)
        setFavorited(false)
      } else {
        await favoriteLineup(lineup.id)
        setFavorited(true)
      }
      Taro.showToast({ title: favorited ? '已取消收藏' : '已收藏', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' })
    } finally {
      setBusy(false)
    }
  }

  if (!lineup) {
    return (
      <View className='safe-page'>
        <View className='skeleton-card'>
          <View className='skeleton-card__image' style={{ height: 360 }} />
          <View className='skeleton-card__line skeleton-card__line--w60' />
          <View className='skeleton-card__line skeleton-card__line--w80' />
        </View>
      </View>
    )
  }

  const steps = getSteps(lineup)
  const current = steps[currentStep]
  const hasMinimap = lineup.minimap_x != null && lineup.minimap_y != null
  const hasLanding = lineup.landing_x != null && lineup.landing_y != null

  return (
    <View className='safe-page detail-page'>
      {/* 1. 媒体主舞台：当前步骤的图 + 步骤切换器（沉浸式） */}
      <View className='detail-stage'>
        {current?.image_path ? (
          <Image className='detail-stage__image' mode='aspectFill' src={resolveAssetUrl(current.image_path)} />
        ) : (
          <View className='detail-stage__placeholder'><Text>暂无步骤图</Text></View>
        )}
        <View className='detail-stage__topbar'>
          <Text className='detail-stage__source'>{getSourceLabel(lineup.source_type)}</Text>
        </View>
        {steps.length > 1 ? (
          <View className='detail-stage__steps'>
            {steps.map((step, index) => (
              <View
                key={`${step.order_index}-${index}`}
                className={`detail-stage__step ${index === currentStep ? 'detail-stage__step--active' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <Text className='detail-stage__step-index'>{index + 1}</Text>
                <Text className='detail-stage__step-title'>{step.title}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* 2. 标题区：地图·特工（主锚点）+ chips 副信息 */}
      <View className='detail-title-block'>
        <Text className='detail-title-block__main'>{getMapLabel(lineup.map)} · {getAgentLabel(lineup.agent)}</Text>
        <View className='detail-title-block__chips'>
          <Text className='chip chip--ghost'>{getSideLabel(lineup.side)} · {getSiteLabel(lineup.site)}</Text>
          <Text className='chip chip--ghost'>{getAbilityLabel(lineup.ability)}</Text>
          <Text className='chip chip--ghost'>{getThrowLabel(lineup.throw_type)}</Text>
        </View>
      </View>

      {/* 3. 当前步骤详情：标题 + 描述 */}
      {current ? (
        <View className='detail-current-step'>
          <View className='detail-current-step__head'>
            <Text className='detail-current-step__index'>{currentStep + 1}</Text>
            <Text className='detail-current-step__title'>{current.title}</Text>
          </View>
          {current.note ? <Text className='detail-current-step__note'>{current.note}</Text> : null}
        </View>
      ) : null}

      {/* 4. 小地图：仅当有标注时显示，缩略尺寸 */}
      {hasMinimap || hasLanding ? (
        <View className='detail-minimap'>
          <View className='detail-minimap__head'>
            <Text className='detail-minimap__title'>小地图定位</Text>
            <Text className='detail-minimap__map'>{getMapLabel(lineup.map)}</Text>
          </View>
          <View className='detail-minimap__canvas'>
            <View className='detail-minimap__grid' />
            {hasMinimap ? (
              <View className='detail-minimap__marker detail-minimap__marker--standing' style={{ left: `${lineup.minimap_x! * 100}%`, top: `${lineup.minimap_y! * 100}%` }}>
                <Text className='detail-minimap__marker-dot' />
                <Text className='detail-minimap__marker-label detail-minimap__marker-label--standing'>站位</Text>
              </View>
            ) : null}
            {hasLanding ? (
              <View className='detail-minimap__marker detail-minimap__marker--landing' style={{ left: `${lineup.landing_x! * 100}%`, top: `${lineup.landing_y! * 100}%` }}>
                <Text className='detail-minimap__marker-dot' />
                <Text className='detail-minimap__marker-label detail-minimap__marker-label--landing'>落点</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 5. 元数据：创建时间 + 复制原视频 */}
      <View className='detail-meta'>
        <Text className='detail-meta__item'>创建于 {new Date(lineup.created_at).toLocaleDateString('zh-CN')}</Text>
        {lineup.original_video_url ? (
          <Text className='detail-meta__link' onClick={() => Taro.setClipboardData({ data: lineup.original_video_url! })}>复制原视频链接</Text>
        ) : null}
      </View>

      {/* 6. 修改点位（管理员/作者专属）：作为独立行 */}
      {lineup.can_edit && lineup.original_video_url ? (
        <View className='detail-correction' onClick={() => Taro.navigateTo({ url: `/pages/contribute/index?mode=video&correctFromLineupId=${lineup.id}` })}>
          <Text>修改这个点位</Text>
        </View>
      ) : null}

      {/* 7. 粘性操作栏：点赞 / 收藏 */}
      <View className='detail-actionbar'>
        <LoginGuard compact onLoginSuccess={load}>
          <View className='detail-actionbar__inner'>
            <View className={`detail-actionbar__btn ${liked ? 'detail-actionbar__btn--active' : ''}`} onClick={toggleLike}>
              <Text>{liked ? '已赞' : '点赞'} · {lineup.likes_count}</Text>
            </View>
            <View className={`detail-actionbar__btn ${favorited ? 'detail-actionbar__btn--active' : ''}`} onClick={toggleFavorite}>
              <Text>{favorited ? '已收藏' : '收藏'}</Text>
            </View>
          </View>
        </LoginGuard>
      </View>
    </View>
  )
}
