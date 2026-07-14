import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { Image, Text, View } from '@tarojs/components'
import { useEffect, useState } from 'react'

import { ImagePreview } from '@/components/image-preview'
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

type MinimapRect = { left: number; top: number; width: number; height: number }

// 详情页缩略小地图：实测 Image 元素 rect + 原图 aspect，通用换算
// 不再 hardcode 16:9 + 1:1 假设：任何 canvas / 图片比例都能正确落点
function MinimapPreview({
  map,
  standingX,
  standingY,
  landingX,
  landingY,
}: {
  map: string
  standingX: number | null
  standingY: number | null
  landingX: number | null
  landingY: number | null
}) {
  const [canvasRect, setCanvasRect] = useState<MinimapRect | null>(null)
  const [mapImgRect, setMapImgRect] = useState<MinimapRect | null>(null)
  const [mapNatural, setMapNatural] = useState<{ width: number; height: number } | null>(null)

  const mapSrc = resolveAssetUrl(`/maps/${map}.png`)

  useEffect(() => {
    let cancelled = false
    Taro.getImageInfo({
      src: mapSrc,
      success: (info) => {
        if (cancelled) return
        if (info.width > 0 && info.height > 0) {
          setMapNatural({ width: info.width, height: info.height })
        }
      },
    })
    return () => {
      cancelled = true
    }
  }, [mapSrc])

  const measure = () => {
    const query = Taro.createSelectorQuery()
    query.select('#detail-minimap-canvas').boundingClientRect()
    query.select('#detail-minimap-image').boundingClientRect()
    query.exec((results: any) => {
      const canvas = results?.[0] as MinimapRect | null
      const img = results?.[1] as MinimapRect | null
      if (canvas && canvas.width > 0) setCanvasRect(canvas)
      if (img && img.width > 0) setMapImgRect(img)
    })
  }

  const handleImageLoad = () => {
    // 等 Image 元素 layout 完再测
    setTimeout(measure, 0)
  }

  // 计算 aspectFit 下的「地图实际可见」content box
  // 1:1 minimap 放在 16:9 canvas → 横向留白、纵向填满，与 hardcode 公式一致
  // 4:3 或其他比例也走通用公式
  const contentBox = (): { left: number; top: number; width: number; height: number } | null => {
    const m = mapImgRect
    if (!m || m.width <= 0 || m.height <= 0) return null
    if (!mapNatural || mapNatural.width <= 0 || mapNatural.height <= 0) {
      return { left: m.left, top: m.top, width: m.width, height: m.height }
    }
    const elAspect = m.width / m.height
    const imgAspect = mapNatural.width / mapNatural.height
    if (imgAspect > elAspect) {
      const contentH = m.width / imgAspect
      return { left: m.left, top: m.top + (m.height - contentH) / 2, width: m.width, height: contentH }
    }
    const contentW = m.height * imgAspect
    return { left: m.left + (m.width - contentW) / 2, top: m.top, width: contentW, height: m.height }
  }

  const hasStanding = standingX != null && standingY != null
  const hasLanding = landingX != null && landingY != null

  const pointStyle = (x: number, y: number) => {
    const c = canvasRect
    const box = contentBox()
    if (!c || c.width <= 0 || !box) return { display: 'none' as const }
    const left = (box.left - c.left + x * box.width) / c.width
    const top = (box.top - c.top + y * box.height) / c.height
    return { left: `${left * 100}%`, top: `${top * 100}%` }
  }

  return (
    <View
      id='detail-minimap-canvas'
      className='detail-minimap__canvas'
    >
      <View
        id='detail-minimap-image-wrap'
        className='detail-minimap__image-wrap'
      >
        <Image
          id='detail-minimap-image'
          className='detail-minimap__image'
          src={mapSrc}
          mode='aspectFit'
          onLoad={handleImageLoad}
          onError={handleImageLoad}
        />
      </View>
      <View className='detail-minimap__grid' />

      {hasStanding ? (
        <View
          className='detail-minimap__marker detail-minimap__marker--standing'
          style={pointStyle(standingX!, standingY!)}
        >
          <Text className='detail-minimap__marker-dot' />
          <Text className='detail-minimap__marker-label detail-minimap__marker-label--standing'>站位</Text>
        </View>
      ) : null}
      {hasLanding ? (
        <View
          className='detail-minimap__marker detail-minimap__marker--landing'
          style={pointStyle(landingX!, landingY!)}
        >
          <Text className='detail-minimap__marker-dot' />
          <Text className='detail-minimap__marker-label detail-minimap__marker-label--landing'>落点</Text>
        </View>
      ) : null}
    </View>
  )
}

export default function DetailPage() {
  const router = useRouter()
  const id = Number(router.params.id)
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

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

  const previewImages = steps.map((step) => ({
    src: resolveAssetUrl(step.image_path || ""),
    title: step.title,
    description: step.note || "",
  }))

  return (
    <View className='safe-page detail-page'>
      {/* 1. 大图区：无遮挡，图占据 60vh */}
      <View className='detail-stage'>
        <View className='detail-stage__img-wrapper'>
          {current?.image_path ? (
            <Image
              className='detail-stage__image'
              mode='aspectFill'
              src={resolveAssetUrl(current.image_path)}
              onClick={() => setPreviewIndex(currentStep)}
            />
          ) : (
            <View className='detail-stage__placeholder'><Text>暂无步骤图</Text></View>
          )}
        </View>
        <View className='detail-stage__topbar'>
          <Text className='detail-stage__source'>{getSourceLabel(lineup.source_type)}</Text>
        </View>
      </View>

      {/* 1b. 步骤切换器：图正下方独立区域，不叠在图上 */}
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
            <Text className='detail-minimap__map-name'>{getMapLabel(lineup.map)}</Text>
          </View>
          <MinimapPreview
            map={lineup.map}
            standingX={lineup.minimap_x ?? null}
            standingY={lineup.minimap_y ?? null}
            landingX={lineup.landing_x ?? null}
            landingY={lineup.landing_y ?? null}
          />
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

      {/* 图片预览 */}
      {previewIndex !== null ? (
        <ImagePreview
          images={previewImages}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      ) : null}
    </View>
  )
}
