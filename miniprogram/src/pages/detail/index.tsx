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

function markerStyle(x?: number | null, y?: number | null) {
  if (x == null || y == null) return { display: 'none' }
  return { left: `${x * 100}%`, top: `${y * 100}%` }
}

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

  return (
    <View className='safe-page detail-page'>
      <View className='detail-gallery'>
        {current?.image_path ? (
          <Image className='detail-gallery__image' mode='aspectFill' src={resolveAssetUrl(current.image_path)} />
        ) : (
          <View className='detail-gallery__placeholder'><Text>暂无步骤图</Text></View>
        )}
        {steps.length > 1 ? (
          <View className='detail-gallery__tabs'>
            {steps.map((step, index) => (
              <View key={`${step.order_index}-${index}`} className={`detail-gallery__tab ${index === currentStep ? 'detail-gallery__tab--active' : ''}`} onClick={() => setCurrentStep(index)}>
                <Text>{index + 1}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View className='detail-header-card'>
        <View className='detail-header-card__top'>
          <Text className='detail-header-card__source'>{getSourceLabel(lineup.source_type)}</Text>
          <Text className='detail-header-card__site'>{getSideLabel(lineup.side)} · {getSiteLabel(lineup.site)}</Text>
        </View>
        <Text className='detail-header-card__title'>{getMapLabel(lineup.map)} · {getAgentLabel(lineup.agent)}</Text>
        <Text className='detail-header-card__subtitle'>{getAbilityLabel(lineup.ability)} · {getThrowLabel(lineup.throw_type)}</Text>
      </View>

      <LoginGuard>
        <View className='detail-actions'>
          <View className={`detail-actions__btn ${liked ? 'detail-actions__btn--active' : ''}`} onClick={toggleLike}>
            <Text>{liked ? '已赞' : '点赞'} · {lineup.likes_count}</Text>
          </View>
          <View className={`detail-actions__btn ${favorited ? 'detail-actions__btn--active' : ''}`} onClick={toggleFavorite}>
            <Text>{favorited ? '已收藏' : '收藏'}</Text>
          </View>
        </View>
        {lineup.original_video_url ? (
          <View className='detail-correction' onClick={() => Taro.navigateTo({ url: `/pages/contribute/index?mode=video&correctFromLineupId=${lineup.id}` })}>
            <Text>手动矫正这个视频帧</Text>
          </View>
        ) : null}
      </LoginGuard>

      {current ? (
        <View className='detail-step-info'>
          <Text className='detail-step-info__title'>步骤 {currentStep + 1} / {steps.length}: {current.title}</Text>
          <Text className='detail-step-info__note'>{current.note || '暂无备注'}</Text>
        </View>
      ) : null}

      <View className='section-title'>全部步骤</View>
      <View className='detail-steps'>
        {steps.map((step, index) => (
          <View key={`${step.order_index}-${index}`} className={`detail-step ${index === currentStep ? 'detail-step--active' : ''}`} onClick={() => setCurrentStep(index)}>
            <View className='detail-step__index'><Text>{index + 1}</Text></View>
            <View className='detail-step__content'>
              <Text className='detail-step__title'>{step.title || `步骤 ${index + 1}`}</Text>
              <Text className='detail-step__note'>{step.note || '暂无备注'}</Text>
            </View>
          </View>
        ))}
      </View>

      {hasMinimap ? (
        <>
          <View className='section-title'>小地图定位</View>
          <View className='detail-minimap'>
            <Text className='detail-minimap__map'>{getMapLabel(lineup.map)}</Text>
            <View className='detail-minimap__grid' />
            <View className='detail-minimap__marker detail-minimap__marker--standing' style={markerStyle(lineup.minimap_x, lineup.minimap_y)}><Text>站</Text></View>
            <View className='detail-minimap__marker detail-minimap__marker--landing' style={markerStyle(lineup.landing_x, lineup.landing_y)}><Text>落</Text></View>
          </View>
        </>
      ) : null}

      <View className='divider' />
      <View className='detail-footer'>
        <Text className='detail-footer__item'>创建于 {new Date(lineup.created_at).toLocaleDateString('zh-CN')}</Text>
        {lineup.original_video_url ? (
          <Text className='detail-footer__link' onClick={() => Taro.setClipboardData({ data: lineup.original_video_url! })}>复制原视频链接</Text>
        ) : null}
      </View>
    </View>
  )
}
