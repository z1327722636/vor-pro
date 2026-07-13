import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'
import { useState } from 'react'

import { LoginGuard } from '@/components/login-guard'
import { resolveAssetUrl } from '@/services/api'
import { getLineup } from '@/services/lineups'
import { favoriteLineup, likeLineup, unfavoriteLineup, unlikeLineup } from '@/services/social'
import type { Lineup } from '@/services/types'
import './index.css'

export default function DetailPage() {
  const router = useRouter()
  const id = Number(router.params.id)
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!id) return
    try {
      const data = await getLineup(id)
      setLineup(data)
      setLiked(data.is_liked)
      setFavorited(data.is_favorited)
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
    return <View className='safe-page muted'>加载中...</View>
  }

  return (
    <View className='safe-page detail-page'>
      <View className='detail-header'>
        <Text className='detail-header__title'>{lineup.map} · {lineup.site.toUpperCase()}</Text>
        <Text className='detail-header__meta'>{lineup.agent} / {lineup.ability} / {lineup.side}</Text>
      </View>

      <View className='detail-actions'>
        <LoginGuard>
          <Button className='detail-actions__button' loading={busy} onClick={toggleLike}>{liked ? '已点赞' : '点赞'} {lineup.likes_count}</Button>
          <Button className='detail-actions__button detail-actions__button--ghost' loading={busy} onClick={toggleFavorite}>{favorited ? '取消收藏' : '收藏'}</Button>
        </LoginGuard>
      </View>

      <View className='section-title'>投掷步骤</View>
      {lineup.steps.map((step) => {
        const imageUrl = resolveAssetUrl(step.image_path)
        return (
          <View className='detail-step' key={`${step.order_index}-${step.title}`}>
            <Text className='detail-step__title'>{step.title}</Text>
            {imageUrl ? <Image className='detail-step__image' mode='aspectFill' src={imageUrl} /> : null}
            {step.note ? <Text className='detail-step__note'>{step.note}</Text> : null}
          </View>
        )
      })}

      <View className='detail-info'>
        <Text>类型：{lineup.throw_type}</Text>
        <Text>来源：{lineup.source_type}</Text>
        <Text>创建时间：{new Date(lineup.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
  )
}
