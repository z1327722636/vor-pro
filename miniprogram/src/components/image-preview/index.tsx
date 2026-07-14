import { Image, Text, View } from '@tarojs/components'
import { useCallback, useRef, useState } from 'react'
import './index.css'

type PreviewImage = {
  src: string
  title: string
  description: string
}

type ImagePreviewProps = {
  images: PreviewImage[]
  index: number
  onClose: () => void
}

function clampScale(s: number) {
  return Math.min(Math.max(s, 1), 5)
}

export function ImagePreview({ images, index: initialIndex, onClose }: ImagePreviewProps) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const touchStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  const current = images[index]
  const total = images.length
  const hasPrev = index > 0
  const hasNext = index < total - 1
  const isZoomed = scale > 1

  const resetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const goPrev = useCallback(() => {
    if (!hasPrev) return
    setIndex((i) => i - 1)
    resetView()
  }, [hasPrev, resetView])

  const goNext = useCallback(() => {
    if (!hasNext) return
    setIndex((i) => i + 1)
    resetView()
  }, [hasNext, resetView])

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s * 1.2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const ns = clampScale(s / 1.2)
      if (ns <= 1.01) {
        setPan({ x: 0, y: 0 })
        return 1
      }
      return ns
    })
  }, [])

  const handleTouchStart = (e: any) => {
    if (!isZoomed) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    panStart.current = { ...pan }
    setDragging(true)
  }

  const handleTouchMove = (e: any) => {
    if (!dragging) return
    const touch = e.touches[0]
    setPan({
      x: panStart.current.x + (touch.clientX - touchStart.current.x),
      y: panStart.current.y + (touch.clientY - touchStart.current.y),
    })
  }

  const handleTouchEnd = () => {
    setDragging(false)
  }

  return (
    <View className='image-preview'>
      {/* 顶部工具栏 */}
      <View className='image-preview__toolbar'>
        <Text className='image-preview__counter'>
          {index + 1} / {total}{isZoomed ? ` · ${Math.round(scale * 100)}%` : ''}
        </Text>
        <View className='image-preview__actions'>
          <View
            className={`image-preview__btn ${!isZoomed ? 'image-preview__btn--disabled' : ''}`}
            onClick={zoomOut}
          >
            <Text className='image-preview__btn-icon'>−</Text>
          </View>
          <View
            className={`image-preview__btn ${scale >= 5 ? 'image-preview__btn--disabled' : ''}`}
            onClick={zoomIn}
          >
            <Text className='image-preview__btn-icon'>+</Text>
          </View>
          <View
            className={`image-preview__btn ${!isZoomed ? 'image-preview__btn--disabled' : ''}`}
            onClick={resetView}
          >
            <Text className='image-preview__btn-icon'>1:1</Text>
          </View>
          <View className='image-preview__btn image-preview__btn--close' onClick={onClose}>
            <Text className='image-preview__btn-icon'>✕</Text>
          </View>
        </View>
      </View>

      {/* 图片区域 - 缩放时切换到"铺满屏幕"模式，scale 从铺满状态向外扩张 */}
      <View
        className='image-preview__body'
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {current?.src ? (
          <View
            className='image-preview__canvas'
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}
          >
            <Image
              className='image-preview__image'
              mode={isZoomed ? 'aspectFill' : 'aspectFit'}
              src={current.src}
            />
          </View>
        ) : null}
      </View>

      {/* 底部信息 */}
      <View className='image-preview__bottom'>
        {(current?.title || current?.description) ? (
          <View className='image-preview__info'>
            {current.title ? <Text className='image-preview__title'>{current.title}</Text> : null}
            {current.description ? (
              <Text className={`image-preview__desc ${current.title ? 'image-preview__desc--mt' : ''}`}>
                {current.description}
              </Text>
            ) : null}
          </View>
        ) : null}

        {total > 1 ? (
          <View className='image-preview__nav'>
            <View
              className={`image-preview__nav-btn ${hasPrev ? '' : 'image-preview__nav-btn--disabled'}`}
              onClick={(e) => { e.stopPropagation(); goPrev() }}
            >
              <Text className='image-preview__nav-arrow'>‹</Text>
              <Text className='image-preview__nav-label'>上一张</Text>
            </View>
            <View
              className={`image-preview__nav-btn ${hasNext ? '' : 'image-preview__nav-btn--disabled'}`}
              onClick={(e) => { e.stopPropagation(); goNext() }}
            >
              <Text className='image-preview__nav-label'>下一张</Text>
              <Text className='image-preview__nav-arrow'>›</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}
