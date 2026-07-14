import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { Button, Image, Input, Slider, Text, Textarea, Video, View } from '@tarojs/components'
import { useState } from 'react'

import { LoginGuard } from '@/components/login-guard'
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

function CoordinatePicker({ value, onChange }: { value: Coords; onChange: (value: Coords) => void }) {
  const updatePoint = (key: CoordKey, axis: 'x' | 'y', sliderValue: number) => {
    onChange({ ...value, [key]: { ...value[key], [axis]: sliderValue / 100 } })
  }
  const ensurePoint = (key: CoordKey) => {
    onChange({ ...value, [key]: { x: value[key].x ?? 0.5, y: value[key].y ?? 0.5 } })
  }
  const clearPoint = (key: CoordKey) => {
    onChange({ ...value, [key]: { x: null, y: null } })
  }

  return (
    <View className='coord-card'>
      <View className='panel-head'>
        <Text className='panel-title'>小地图坐标</Text>
        <Text className='panel-desc'>用滑块手动标站位和落点，非必填。</Text>
      </View>
      {(['standing', 'landing'] as CoordKey[]).map((key) => {
        const point = value[key]
        const enabled = point.x != null && point.y != null
        return (
          <View key={key} className='coord-row'>
            <View className='coord-row__head'>
              <Text className='coord-row__title'>{key === 'standing' ? '站位' : '落点'}</Text>
              {enabled ? (
                <Text className='coord-row__action' onClick={() => clearPoint(key)}>清除</Text>
              ) : (
                <Text className='coord-row__action' onClick={() => ensurePoint(key)}>开始标注</Text>
              )}
            </View>
            {enabled ? (
              <>
                <View className='coord-slider'><Text>X</Text><Slider value={Math.round((point.x || 0) * 100)} min={0} max={100} activeColor='#ff4655' backgroundColor='rgba(255,255,255,0.14)' onChange={(event) => updatePoint(key, 'x', event.detail.value)} /></View>
                <View className='coord-slider'><Text>Y</Text><Slider value={Math.round((point.y || 0) * 100)} min={0} max={100} activeColor='#ff4655' backgroundColor='rgba(255,255,255,0.14)' onChange={(event) => updatePoint(key, 'y', event.detail.value)} /></View>
              </>
            ) : <Text className='coord-row__empty'>未标注</Text>}
          </View>
        )
      })}
    </View>
  )
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

        <CoordinatePicker value={coords} onChange={setCoords} />

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
                        <Text className='step-editor__delete' onClick={() => removeImage(item.id)}>删除</Text>
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
    </View>
  )
}
