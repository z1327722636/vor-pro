import Taro from '@tarojs/taro'
import { Canvas, View, Text } from '@tarojs/components'
import { useEffect, useRef, useState } from 'react'
import './index.css'

type ImageAnnotationKind = 'arrow' | 'box' | 'point'

type ImageAnnotation = {
  id: string
  type: ImageAnnotationKind
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

const COLORS = ['#FF4655', '#94d2ff', '#FACC15', '#34D399']

const TOOL_LABELS: Record<ImageAnnotationKind, string> = {
  arrow: '箭头',
  box: '画框',
  point: '打点',
}

function clamp(n: number) {
  return Math.min(1, Math.max(0, n))
}

function nextId() {
  return `a${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isMeaningful(a: ImageAnnotation) {
  if (a.type === 'point') return true
  const dx = Math.abs(a.x2 - a.x1)
  const dy = Math.abs(a.y2 - a.y1)
  return a.type === 'arrow' ? Math.hypot(dx, dy) > 0.03 : dx > 0.02 && dy > 0.02
}

function drawArrow(ctx: any, x1: number, y1: number, x2: number, y2: number, color: string) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 14
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawBox(ctx: any, x1: number, y1: number, x2: number, y2: number, color: string, draft = false) {
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.globalAlpha = draft ? 0.06 : 0.1
  ctx.fillRect(left, top, w, h)
  ctx.globalAlpha = 1
  ctx.strokeRect(left, top, w, h)
  ctx.restore()
}

function drawPoint(ctx: any, x: number, y: number, color: string) {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 4, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function ImageAnnotationEditor({
  imagePath,
  isOpen,
  onClose,
  onSave,
}: {
  imagePath: string
  isOpen: boolean
  onClose: () => void
  onSave: (annotatedPath: string) => void
}) {
  const [tool, setTool] = useState<ImageAnnotationKind>('arrow')
  const [color, setColor] = useState(COLORS[0])
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([])
  const [draft, setDraft] = useState<ImageAnnotation | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const ctxRef = useRef<any>(null)
  const canvasRef = useRef<any>(null)
  const imgRef = useRef<any>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const dprRef = useRef(1)

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setAnnotations([])
      setDraft(null)
      setImageLoaded(false)
      setCanvasReady(false)
    }
  }, [isOpen])

  // Init canvas
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query
        .select('#annot-canvas')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (!res?.[0]?.node) return
          const canvas = res[0].node
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          const displayW = res[0].width
          const displayH = res[0].height
          canvas.width = displayW * dpr
          canvas.height = displayH * dpr
          const ctx = canvas.getContext('2d')
          ctx.scale(dpr, dpr)
          canvasRef.current = canvas
          ctxRef.current = ctx
          dprRef.current = dpr
          sizeRef.current = { w: displayW, h: displayH }
          setCanvasReady(true)
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Load image when canvas is ready
  useEffect(() => {
    if (!canvasReady || !canvasRef.current) return
    const canvas = canvasRef.current
    const img = canvas.createImage()
    img.onload = () => {
      imgRef.current = img
      setImageLoaded(true)
    }
    img.onerror = () => {
      Taro.showToast({ title: '图片加载失败', icon: 'none' })
    }
    img.src = imagePath
  }, [canvasReady, imagePath])

  // Redraw canvas when annotations or draft change
  useEffect(() => {
    if (!imageLoaded || !ctxRef.current || !imgRef.current) return
    redraw()
  }, [imageLoaded, annotations, draft])

  function redraw() {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(imgRef.current, 0, 0, w, h)
    for (const ann of annotations) {
      renderAnnotation(ctx, ann, w, h, false)
    }
    if (draft) {
      renderAnnotation(ctx, draft, w, h, true)
    }
  }

  function renderAnnotation(ctx: any, ann: ImageAnnotation, w: number, h: number, isDraft: boolean) {
    const x1 = ann.x1 * w
    const y1 = ann.y1 * h
    const x2 = ann.x2 * w
    const y2 = ann.y2 * h
    const c = ann.color
    if (ann.type === 'arrow') {
      drawArrow(ctx, x1, y1, x2, y2, c)
    } else if (ann.type === 'box') {
      drawBox(ctx, x1, y1, x2, y2, c, isDraft)
    } else {
      drawPoint(ctx, x1, y1, c)
    }
  }

  function handleTouchStart(e: any) {
    if (!imageLoaded) return
    const touch = e.touches?.[0]
    if (!touch) return
    const { w, h } = sizeRef.current
    if (!w || !h) return
    const x = clamp(touch.x / w)
    const y = clamp(touch.y / h)
    setDraft({
      id: 'draft',
      type: tool,
      x1: x,
      y1: y,
      x2: tool === 'point' ? x : x,
      y2: tool === 'point' ? y : y,
      color,
    })
  }

  function handleTouchMove(e: any) {
    const touch = e.touches?.[0]
    if (!touch || !draft || draft.type === 'point') return
    const { w, h } = sizeRef.current
    if (!w || !h) return
    setDraft({
      ...draft,
      x2: clamp(touch.x / w),
      y2: clamp(touch.y / h),
    })
  }

  function handleTouchEnd() {
    if (!draft) return
    if (draft.type === 'point') {
      // Point: commit immediately as a small anchor
      const pt = {
        id: nextId(),
        type: 'point' as const,
        x1: draft.x1,
        y1: draft.y1,
        x2: draft.x1 + 0.02,
        y2: draft.y1 + 0.02,
        color: draft.color,
      }
      setAnnotations((prev) => [...prev, pt])
    } else if (isMeaningful(draft)) {
      setAnnotations((prev) => [...prev, { ...draft, id: nextId() }])
    }
    setDraft(null)
  }

  function removeLast() {
    setAnnotations((prev) => prev.slice(0, -1))
  }

  function clearAll() {
    setAnnotations([])
  }

  async function handleSave() {
    if (!canvasRef.current || !sizeRef.current.w) return
    Taro.showLoading({ title: '合成标注...' })
    try {
      // Force final redraw without draft
      const ctx = ctxRef.current
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(imgRef.current, 0, 0, w, h)
      for (const ann of annotations) {
        renderAnnotation(ctx, ann, w, h, false)
      }

      const tempRes = await Taro.canvasToTempFilePath({
        canvas: canvasRef.current,
        fileType: 'jpg',
        quality: 0.9,
      })
      Taro.hideLoading()
      onSave(tempRes.tempFilePath)
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '导出失败', icon: 'none' })
    }
  }

  if (!isOpen) return null

  return (
    <View className='annot-overlay'>
      {/* Toolbar */}
      <View className='annot-toolbar'>
        <View className='annot-toolbar__row'>
          {(['arrow', 'box', 'point'] as ImageAnnotationKind[]).map((t) => (
            <Text
              key={t}
              className={`annot-tool-btn ${tool === t ? 'annot-tool-btn--active' : ''}`}
              onClick={() => setTool(t)}
            >
              {TOOL_LABELS[t]}
            </Text>
          ))}
        </View>
        <View className='annot-toolbar__row'>
          <View className='annot-colors'>
            {COLORS.map((c) => (
              <View
                key={c}
                className={`annot-color-dot ${color === c ? 'annot-color-dot--active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </View>
          <Text className='annot-tool-btn annot-tool-btn--ghost' onClick={removeLast}>撤销</Text>
          <Text className='annot-tool-btn annot-tool-btn--ghost' onClick={clearAll}>清空</Text>
        </View>
      </View>

      {/* Canvas area */}
      <View className='annot-canvas-wrap'>
        {!imageLoaded ? (
          <View className='annot-loading'>加载图片中...</View>
        ) : null}
        <Canvas
          id='annot-canvas'
          type='2d'
          className='annot-canvas'
          disableScroll
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {annotations.length > 0 ? (
          <View className='annot-count-badge'>
            <Text>{annotations.length} 个标注</Text>
          </View>
        ) : null}
      </View>

      {/* Action bar */}
      <View className='annot-actions'>
        <Text className='annot-action-btn annot-action-btn--cancel' onClick={onClose}>
          取消
        </Text>
        <Text className='annot-action-btn annot-action-btn--save' onClick={handleSave}>
          完成标注
        </Text>
      </View>
    </View>
  )
}
