import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { Button, Image, Input, Text, Textarea, Video, View } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'

import { LoginGuard } from '@/components/login-guard'
import { ImageAnnotationEditor } from '@/components/image-annotation-editor'
import { NativePicker } from '@/components/native-picker'
import { resolveAssetUrl } from '@/services/api'
import {
  defaultLineupBaseValue,
  getCorrectionSession,
  resolveExternalVideo,
  submitCorrection,
  submitManualVideo,
  uploadManualLineup,
  withDefaultDescriptions,
  type LineupBaseValue,
  type ManualLineupFormPayload,
  type VideoFrameSubmitPayload,
} from '@/services/manual'
import {
  agentAbilityMap,
  agentOptions,
  getMapLabel,
  mapOptions,
  sideOptions,
  siteOptions,
  throwOptions,
} from '@/services/labels'
import type { LabelOption } from '@/services/labels'
import './index.css'

type Mode = 'image' | 'video'
type StepImage = { id: string; path: string; size: number; note: string }
type CoordKey = 'standing' | 'landing'
type Coords = {
  standing: { x: number | null; y: number | null }
  landing: { x: number | null; y: number | null }
}

type MinimapRect = { left: number; top: number; width: number; height: number }

const MINIMAP_KEY_STEP = 0.005 // 方向键微调步长（0.5% 归一化）
type VideoNode = { id: string; label: string; timestampMs: number; note: string }

const MAX_IMAGES = 6
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const emptyCoords = (): Coords => ({
  standing: { x: null, y: null },
  landing: { x: null, y: null },
})
const defaultVideoNodes = (): VideoNode[] => ([
  { id: 'standing', label: '站位帧', timestampMs: 0, note: '' },
  { id: 'aim', label: '瞄准帧', timestampMs: 0, note: '' },
  { id: 'landing', label: '落点帧', timestampMs: 0, note: '' },
])

function optionLabel(options: LabelOption[], value: string) {
  return options.find((item) => item.value === value)?.label || value
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || `image-${Date.now()}.jpg`
}

function readFileBase64(path: string) {
  const manager = Taro.getFileSystemManager()
  return String(manager.readFileSync(path, 'base64'))
}

function buildFormPayload(form: LineupBaseValue, coords: Coords, nodes?: VideoNode[]): ManualLineupFormPayload {
  const descriptions = nodes ? {
    standing_description: nodes[0]?.note || '',
    aim_description: nodes[1]?.note || '',
    landing_description: nodes[2]?.note || '',
  } : undefined
  return {
    ...withDefaultDescriptions(form, descriptions),
    minimap_x: coords.standing.x,
    minimap_y: coords.standing.y,
    landing_x: coords.landing.x,
    landing_y: coords.landing.y,
  }
}

function BaseFields({ value, onChange }: { value: LineupBaseValue; onChange: (value: LineupBaseValue) => void }) {
  const abilityOptions = agentAbilityMap[value.agent] || []
  const update = (key: keyof LineupBaseValue, nextValue: string) => {
    const next = { ...value, [key]: nextValue }
    if (key === 'agent') next.ability = agentAbilityMap[nextValue]?.[0]?.value || ''
    onChange(next)
  }

  return (
    <View className='form-grid'>
      <NativePicker label='地图' value={value.map} options={mapOptions} onChange={(next) => update('map', next)} />
      <NativePicker label='点位' value={value.site} options={siteOptions} onChange={(next) => update('site', next)} />
      <NativePicker label='阵营' value={value.side} options={sideOptions} onChange={(next) => update('side', next)} />
      <NativePicker label='英雄' value={value.agent} options={agentOptions} onChange={(next) => update('agent', next)} />
      <NativePicker label='技能' value={value.ability} options={abilityOptions} onChange={(next) => update('ability', next)} />
      <NativePicker label='投掷' value={value.throw_type} options={throwOptions} onChange={(next) => update('throw_type', next)} />
    </View>
  )
}

function MinimapPicker({ map, value, onChange }: { map: string; value: Coords; onChange: (value: Coords) => void }) {
  const [activePoint, setActivePoint] = useState<CoordKey>('standing')
  const [imageLoaded, setImageLoaded] = useState(false)
  // 用 state 而不是 ref：state 变化能驱动 marker 重新定位
  const [canvasRect, setCanvasRect] = useState<MinimapRect | null>(null)
  const [mapImgRect, setMapImgRect] = useState<MinimapRect | null>(null)
  const [mapNatural, setMapNatural] = useState<{ width: number; height: number } | null>(null)

  const mapSrc = resolveAssetUrl(`/maps/${map}.png`)

  // 地图切换：清空状态，等新图加载完再 measure
  useEffect(() => {
    setImageLoaded(false)
    setCanvasRect(null)
    setMapImgRect(null)
    setMapNatural(null)
  }, [map, mapSrc])

  // 加载地图原图尺寸（用于计算 aspectFit 后的 letterbox 内容盒子）
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
      fail: () => {
        // 拿不到原图尺寸时 contentBox 会退化为 Image 元素区域，仍可工作
      },
    })
    return () => {
      cancelled = true
    }
  }, [mapSrc])

  // 测量 canvas + Image 的 boundingClientRect（page-relative）
  const measureRects = () => {
    const query = Taro.createSelectorQuery()
    query.select('#minimap-canvas').boundingClientRect()
    query.select('#minimap-map-img').boundingClientRect()
    query.exec((results: any) => {
      const canvas = results?.[0] as MinimapRect | null
      const img = results?.[1] as MinimapRect | null
      if (canvas && canvas.width > 0 && canvas.height > 0) setCanvasRect(canvas)
      if (img && img.width > 0 && img.height > 0) setMapImgRect(img)
    })
  }

  // 监听 Image 加载完成和 canvas 尺寸变化
  const handleImageLoad = () => {
    setImageLoaded(true)
    // 用 setTimeout 等 Image 元素 layout 完再测
    setTimeout(measureRects, 0)
  }

  // aspectFit 下的实际可见内容盒子（去掉 letterbox）
  const contentBox = (): { left: number; top: number; width: number; height: number } | null => {
    const m = mapImgRect
    if (!m || m.width <= 0 || m.height <= 0) return null
    if (!mapNatural || mapNatural.width <= 0 || mapNatural.height <= 0) {
      // 拿不到原图尺寸时退回为整个 Image 元素（1:1 minimap 时与 content 区域一致）
      return { left: m.left, top: m.top, width: m.width, height: m.height }
    }
    const elAspect = m.width / m.height
    const imgAspect = mapNatural.width / mapNatural.height
    if (imgAspect > elAspect) {
      // 图片更宽：左右填满，上下有 letterbox
      const contentH = m.width / imgAspect
      const contentTop = m.top + (m.height - contentH) / 2
      return { left: m.left, top: contentTop, width: m.width, height: contentH }
    }
    // 图片更高：上下填满，左右有 letterbox
    const contentW = m.height * imgAspect
    const contentLeft = m.left + (m.width - contentW) / 2
    return { left: contentLeft, top: m.top, width: contentW, height: m.height }
  }

  const clamp = (v: number) => Math.min(1, Math.max(0, v))

  // 关键修复：统一用 pageX/pageY（page-relative），与 boundingClientRect 同坐标系
  // 旧代码用 touch.x（element-relative）减 box.left（page-relative），坐标系混用导致坐标全错
  const pickFromTouch = (event: any) => {
    const touch = event?.touches?.[0] ?? event?.changedTouches?.[0]
    if (!touch) return null
    const box = contentBox()
    if (!box) {
      measureRects()
      return null
    }
    const cx = touch.pageX ?? touch.clientX ?? 0
    const cy = touch.pageY ?? touch.clientY ?? 0
    if (cx === 0 && cy === 0) return null
    return {
      x: clamp((cx - box.left) / box.width),
      y: clamp((cy - box.top) / box.height),
    }
  }

  const writePoint = (key: CoordKey, point: { x: number; y: number }, advance = false) => {
    onChange({ ...value, [key]: point })
    if (advance && key === 'standing' && !hasLandingPoint(value)) {
      setActivePoint('landing')
    }
  }

  const handleTouchStart = (event: any) => {
    const point = pickFromTouch(event)
    if (!point) return
    writePoint(activePoint, point, true)
  }

  const handleTouchMove = (event: any) => {
    const point = pickFromTouch(event)
    if (!point) return
    writePoint(activePoint, point)
  }

  // marker 拖拽：marker 上的 onTouchStart stopPropagation，避免触发 canvas 的事件
  const handleMarkerTouchStart = (key: CoordKey, event: any) => {
    if (typeof event?.stopPropagation === 'function') event.stopPropagation()
    setActivePoint(key)
  }

  const handleMarkerTouchMove = (key: CoordKey, event: any) => {
    const point = pickFromTouch(event)
    if (!point) return
    writePoint(key, point)
  }

  const clearPoint = (key: CoordKey) => {
    onChange({ ...value, [key]: { x: null, y: null } })
    setActivePoint(key)
  }

  const hasStanding = value.standing.x != null && value.standing.y != null
  const hasLanding = value.landing.x != null && value.landing.y != null

  // 归一化坐标 → canvas 内 CSS 百分比位置（叠加 contentBox letterbox 偏移）
  const pointStyle = (p: { x: number | null; y: number | null }) => {
    if (p.x == null || p.y == null) return { display: 'none' as const }
    const c = canvasRect
    const box = contentBox()
    if (!c || c.width <= 0 || !box) return { display: 'none' as const }
    const left = (box.left - c.left + p.x * box.width) / c.width
    const top = (box.top - c.top + p.y * box.height) / c.height
    return { left: `${left * 100}%`, top: `${top * 100}%` }
  }

  const hint = !hasStanding
    ? '在地图上点一下选站位。'
    : !hasLanding
    ? '再点一下地图选落点。'
    : '拖动 marker 微调，或直接点地图重新标。'

  return (
    <View className='panel'>
      <View className='panel-head'>
        <Text className='panel-title'>小地图标注</Text>
        <Text className='panel-desc'>{getMapLabel(map)} · {hint}</Text>
      </View>

      <View className='minimap-picker__tabs'>
        {(['standing', 'landing'] as CoordKey[]).map((key) => {
          const active = activePoint === key
          const hasIt = key === 'standing' ? hasStanding : hasLanding
          return (
            <View
              key={key}
              className={`minimap-picker__tab minimap-picker__tab--${key} ${active ? 'minimap-picker__tab--active' : ''}`}
              onClick={() => setActivePoint(key)}
            >
              <Text>{key === 'standing' ? '标站位' : '标落点'}</Text>
              {hasIt ? <Text className='minimap-picker__tab-dot'>·</Text> : null}
            </View>
          )
        })}
      </View>

      <View className='minimap-picker__canvas-wrap'>
        <View
          id='minimap-canvas'
          className='minimap-picker__canvas'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <Image
            id='minimap-map-img'
            className='minimap-picker__map-img'
            src={mapSrc}
            mode='aspectFit'
            onLoad={handleImageLoad}
            onError={() => setImageLoaded(true)}
          />
          <View className='minimap-picker__grid' />

          {hasStanding ? (
            <View
              className='minimap-picker__marker minimap-picker__marker--standing'
              style={pointStyle(value.standing)}
              onTouchStart={(e) => handleMarkerTouchStart('standing', e)}
              onTouchMove={(e) => handleMarkerTouchMove('standing', e)}
            >
              <View className={`minimap-picker__dot ${activePoint === 'standing' ? 'minimap-picker__dot--active' : ''}`} />
              <Text className='minimap-picker__label'>站位</Text>
            </View>
          ) : null}

          {hasLanding ? (
            <View
              className='minimap-picker__marker minimap-picker__marker--landing'
              style={pointStyle(value.landing)}
              onTouchStart={(e) => handleMarkerTouchStart('landing', e)}
              onTouchMove={(e) => handleMarkerTouchMove('landing', e)}
            >
              <View className={`minimap-picker__dot ${activePoint === 'landing' ? 'minimap-picker__dot--active' : ''}`} />
              <Text className='minimap-picker__label'>落点</Text>
            </View>
          ) : null}

          {!hasStanding && !hasLanding ? (
            <View className='minimap-picker__center-cross'>
              <View className='minimap-picker__center-cross-x' />
              <View className='minimap-picker__center-cross-y' />
            </View>
          ) : null}
        </View>
      </View>

      <View className='minimap-picker__foot'>
        <View className='minimap-picker__foot-item'>
          <Text className='minimap-picker__foot-label minimap-picker__foot-label--standing'>站位</Text>
          {hasStanding ? (
            <Text className='minimap-picker__foot-val'>{(value.standing.x ?? 0).toFixed(3)}, {(value.standing.y ?? 0).toFixed(3)}</Text>
          ) : <Text className='minimap-picker__foot-val'>未标注</Text>}
          {hasStanding ? <Text className='minimap-picker__foot-clear' onClick={() => clearPoint('standing')}>清除</Text> : null}
        </View>
        <View className='minimap-picker__foot-item'>
          <Text className='minimap-picker__foot-label minimap-picker__foot-label--landing'>落点</Text>
          {hasLanding ? (
            <Text className='minimap-picker__foot-val'>{(value.landing.x ?? 0).toFixed(3)}, {(value.landing.y ?? 0).toFixed(3)}</Text>
          ) : <Text className='minimap-picker__foot-val'>未标注</Text>}
          {hasLanding ? <Text className='minimap-picker__foot-clear' onClick={() => clearPoint('landing')}>清除</Text> : null}
        </View>
      </View>
    </View>
  )
}

function hasLandingPoint(value: Coords) {
  return value.landing.x != null && value.landing.y != null
}

export default function ContributePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('image')
  const [form, setForm] = useState<LineupBaseValue>(() => defaultLineupBaseValue())
  const [coords, setCoords] = useState<Coords>(() => emptyCoords())
  const [images, setImages] = useState<StepImage[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [playableUrl, setPlayableUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoCurrentMs, setVideoCurrentMs] = useState(0)
  const [videoNodes, setVideoNodes] = useState<VideoNode[]>(() => defaultVideoNodes())
  const [submitting, setSubmitting] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [correctFromLineupId, setCorrectFromLineupId] = useState<number | null>(null)
  const [annotatingStepId, setAnnotatingStepId] = useState<string | null>(null)
  const annotatingStep = images.find((item) => item.id === annotatingStepId) ?? null

  useLoad(async () => {
    if (router.params.mode === 'video') setMode('video')
    const correctionId = Number(router.params.correctFromLineupId || 0)
    if (!correctionId) return
    setMode('video')
    setCorrectFromLineupId(correctionId)
    try {
      const session = await getCorrectionSession(correctionId)
      setForm({
        map: session.original_form.map,
        site: session.original_form.site,
        side: session.original_form.side,
        agent: session.original_form.agent,
        ability: session.original_form.ability,
        throw_type: session.original_form.throw_type,
      })
      setCoords({
        standing: {
          x: session.original_form.minimap_x ?? null,
          y: session.original_form.minimap_y ?? null,
        },
        landing: {
          x: session.original_form.landing_x ?? null,
          y: session.original_form.landing_y ?? null,
        },
      })
      setVideoUrl(session.video_url || '')
      setVideoNodes([
        { id: 'standing', label: '站位帧', timestampMs: session.original_timestamps.standing, note: session.original_form.standing_description || '' },
        { id: 'aim', label: '瞄准帧', timestampMs: session.original_timestamps.aim, note: session.original_form.aim_description || '' },
        { id: 'landing', label: '落点帧', timestampMs: session.original_timestamps.landing, note: session.original_form.landing_description || '' },
      ])
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '加载矫正信息失败', icon: 'none' })
    }
  })

  const chooseImages = async () => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      Taro.showToast({ title: `最多 ${MAX_IMAGES} 张`, icon: 'none' })
      return
    }
    const result = await Taro.chooseImage({ count: remaining, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    const selected = result.tempFiles
      .filter((item) => item.size <= MAX_IMAGE_SIZE)
      .map((item, index) => ({ id: `${Date.now()}-${index}`, path: item.path, size: item.size, note: '' }))
    if (selected.length !== result.tempFiles.length) {
      Taro.showToast({ title: '已跳过超过 8MB 的图片', icon: 'none' })
    }
    setImages((current) => [...current, ...selected])
  }

  const updateImageNote = (id: string, note: string) => {
    setImages((current) => current.map((item) => item.id === id ? { ...item, note } : item))
  }

  const removeImage = (id: string) => {
    setImages((current) => current.filter((item) => item.id !== id))
  }

  const submitImages = async () => {
    if (images.length === 0) {
      Taro.showToast({ title: '请先选择步骤图', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        form: buildFormPayload(form, coords),
        images: images.map((item) => ({
          image_base64: readFileBase64(item.path),
          filename: fileName(item.path),
          note: item.note,
        })),
      }
      const lineup = await uploadManualLineup(payload)
      Taro.showToast({ title: '投稿成功', icon: 'success' })
      Taro.navigateTo({ url: `/pages/detail/index?id=${lineup.id}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const resolveVideo = async () => {
    const sourceUrl = videoUrl.trim()
    if (!sourceUrl) {
      Taro.showToast({ title: '请输入视频链接', icon: 'none' })
      return
    }
    setResolving(true)
    try {
      const data = await resolveExternalVideo(sourceUrl)
      setPlayableUrl(resolveAssetUrl(data.playable_url))
      setVideoTitle(data.title || '')
      Taro.showToast({ title: '视频已就绪', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '视频解析失败', icon: 'none' })
    } finally {
      setResolving(false)
    }
  }

  const updateVideoNode = (id: string, patch: Partial<VideoNode>) => {
    setVideoNodes((current) => current.map((node) => node.id === id ? { ...node, ...patch } : node))
  }

  const addVideoNode = () => {
    setVideoNodes((current) => [
      ...current,
      { id: `node-${Date.now()}`, label: `补充帧 ${current.length + 1}`, timestampMs: videoCurrentMs, note: '' },
    ])
  }

  const removeVideoNode = (id: string) => {
    if (videoNodes.length <= 1) return
    setVideoNodes((current) => current.filter((node) => node.id !== id))
  }

  const buildVideoPayload = (): VideoFrameSubmitPayload => {
    const sorted = videoNodes.map((node, index) => ({
      timestamp_ms: node.timestampMs,
      note: node.note,
      order_index: index,
    }))
    const first = sorted[0]?.timestamp_ms || 0
    return {
      source_url: videoUrl.trim() || null,
      timestamps: {
        standing: sorted[0]?.timestamp_ms ?? first,
        aim: sorted[1]?.timestamp_ms ?? first,
        landing: sorted[2]?.timestamp_ms ?? first,
      },
      form: buildFormPayload(form, coords, videoNodes),
      frame_nodes: sorted,
    }
  }

  const submitVideo = async () => {
    if (!videoUrl.trim()) {
      Taro.showToast({ title: '请输入视频链接', icon: 'none' })
      return
    }
    if (new Set(videoNodes.map((node) => node.timestampMs)).size !== videoNodes.length) {
      Taro.showToast({ title: '多个帧时间相同，请手动调整', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const payload = buildVideoPayload()
      const lineup = correctFromLineupId
        ? await submitCorrection(correctFromLineupId, payload)
        : await submitManualVideo(payload)
      Taro.showToast({ title: correctFromLineupId ? '矫正已保存' : '标帧已保存', icon: 'success' })
      Taro.navigateTo({ url: `/pages/detail/index?id=${lineup.id}` })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='safe-page contribute-page'>
      <View className='contribute-hero'>
        <Text className='contribute-hero__eyebrow'>Manual only</Text>
        <Text className='contribute-hero__title'>手动投稿</Text>
        <Text className='contribute-hero__desc'>不走自动识别：你选图、填信息、标时间点，系统只负责保存。</Text>
      </View>

      <LoginGuard>
        <View className='mode-tabs'>
          <View className={`mode-tab ${mode === 'image' ? 'mode-tab--active' : ''}`} onClick={() => setMode('image')}>传步骤图</View>
          <View className={`mode-tab ${mode === 'video' ? 'mode-tab--active' : ''}`} onClick={() => setMode('video')}>视频手动标帧</View>
        </View>

        <View className='panel'>
          <View className='panel-head'>
            <Text className='panel-title'>基础信息</Text>
            <Text className='panel-desc'>{optionLabel(mapOptions, form.map)} · {optionLabel(agentOptions, form.agent)}</Text>
          </View>
          <BaseFields value={form} onChange={setForm} />
        </View>

        <MinimapPicker map={form.map} value={coords} onChange={setCoords} />

        {mode === 'image' ? (
          <View className='panel'>
            <View className='panel-head panel-head--row'>
              <View>
                <Text className='panel-title'>步骤图与备注</Text>
                <Text className='panel-desc'>至少 1 张，最多 {MAX_IMAGES} 张。图片会按顺序成为步骤。</Text>
              </View>
              <Button className='mini-button mini-button--ghost' onClick={chooseImages}>选图</Button>
            </View>

            {images.length === 0 ? (
              <View className='upload-empty' onClick={chooseImages}>点击选择截图或拍照</View>
            ) : (
              <View className='step-list'>
                {images.map((item, index) => (
                  <View key={item.id} className='step-editor'>
                    <Image className='step-editor__image' src={item.path} mode='aspectFill' />
                    <View className='step-editor__body'>
                      <View className='step-editor__head'>
                        <Text className='step-editor__title'>步骤 {index + 1}</Text>
                        <View className='step-editor__actions'>
                          <Text className='step-editor__annotate' onClick={() => setAnnotatingStepId(item.id)}>标注</Text>
                          <Text className='step-editor__delete' onClick={() => removeImage(item.id)}>删除</Text>
                        </View>
                      </View>
                      <Textarea
                        className='textarea'
                        value={item.note}
                        maxlength={1200}
                        placeholder='写站位、瞄准参照、落点效果或操作时机'
                        placeholderClass='textarea__placeholder'
                        onInput={(event) => updateImageNote(item.id, event.detail.value)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
            <Button className='submit-button' loading={submitting} disabled={submitting} onClick={submitImages}>提交点位</Button>
          </View>
        ) : (
          <View className='panel'>
            <View className='panel-head'>
              <Text className='panel-title'>{correctFromLineupId ? '手动矫正视频帧' : '视频手动标帧'}</Text>
              <Text className='panel-desc'>先解析视频，播放到目标画面后把当前时间写入对应帧。</Text>
            </View>
            <View className='video-resolve'>
              <Input
                className='input'
                value={videoUrl}
                placeholder='视频 URL，例如 B 站 BV 链接'
                placeholderClass='input__placeholder'
                onInput={(event) => setVideoUrl(event.detail.value)}
              />
              <Button className='mini-button' loading={resolving} disabled={resolving} onClick={resolveVideo}>解析</Button>
            </View>
            {playableUrl ? (
              <View className='video-box'>
                <Video
                  className='video-player'
                  src={playableUrl}
                  controls
                  showFullscreenBtn
                  onTimeUpdate={(event) => setVideoCurrentMs(Math.round(Number(event.detail.currentTime || 0) * 1000))}
                />
                <Text className='video-box__meta'>当前时间 {formatMs(videoCurrentMs)}{videoTitle ? ` · ${videoTitle}` : ''}</Text>
              </View>
            ) : <View className='upload-empty'>解析后这里会出现播放器</View>}

            <View className='video-node-list'>
              {videoNodes.map((node, index) => (
                <View key={node.id} className='video-node'>
                  <View className='video-node__head'>
                    <Text className='video-node__title'>{node.label}</Text>
                    <View className='video-node__actions'>
                      <Text onClick={() => updateVideoNode(node.id, { timestampMs: videoCurrentMs })}>设为当前</Text>
                      {videoNodes.length > 1 ? <Text onClick={() => removeVideoNode(node.id)}>删除</Text> : null}
                    </View>
                  </View>
                  <View className='video-node__time-row'>
                    <Text className='video-node__time'>{formatMs(node.timestampMs)}</Text>
                    <Input
                      className='video-node__input'
                      type='number'
                      value={String(node.timestampMs)}
                      onInput={(event) => updateVideoNode(node.id, { timestampMs: Math.max(0, Number(event.detail.value) || 0) })}
                    />
                    <Text className='video-node__unit'>毫秒</Text>
                  </View>
                  <Textarea
                    className='textarea'
                    value={node.note}
                    maxlength={1200}
                    placeholder={`节点 ${index + 1} 备注`}
                    placeholderClass='textarea__placeholder'
                    onInput={(event) => updateVideoNode(node.id, { note: event.detail.value })}
                  />
                </View>
              ))}
            </View>
            <View className='submit-row'>
              <Button className='mini-button mini-button--ghost' onClick={addVideoNode}>加一帧</Button>
              <Button className='submit-button submit-button--inline' loading={submitting} disabled={submitting} onClick={submitVideo}>保存当前 Lineup</Button>
            </View>
          </View>
        )}
      </LoginGuard>

      <ImageAnnotationEditor
        imagePath={annotatingStep?.path ?? ''}
        isOpen={annotatingStepId !== null}
        onClose={() => setAnnotatingStepId(null)}
        onSave={(annotatedPath) => {
          if (!annotatingStepId) return
          setImages((current) =>
            current.map((item) =>
              item.id === annotatingStepId ? { ...item, path: annotatedPath } : item,
            ),
          )
          setAnnotatingStepId(null)
        }}
      />
    </View>
  )
}
