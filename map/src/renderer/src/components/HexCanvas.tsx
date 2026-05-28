import { useRef, useEffect, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import {
  hexToPixel, pixelToHex, hexCorners, hexKey, hexesInRadius, AxialCoord,
  riverEdgeKey, parseRiverEdge, NEIGHBOR_TO_EDGE_SLOT, HEX_NEIGHBORS,
} from '../lib/hex'
import { TERRAIN_COLORS } from '../lib/terrain'
import { HexData } from '../types/map'

interface ViewState {
  offsetX: number
  offsetY: number
  zoom: number
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4
const SETTLEMENT_DOT_RADIUS: Record<string, number> = {
  village: 2,
  town: 3,
  city: 4,
  capital: 5,
}

export function HexCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const view = useRef<ViewState>({ offsetX: 100, offsetY: 100, zoom: 1 })
  const isPainting = useRef(false)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const underlayImg = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  const needsRedraw = useRef(true)

  const map = useMapStore((s) => s.map)
  const layers = useMapStore((s) => s.layers)
  const selectedHex = useMapStore((s) => s.selectedHex)
  const activeTool       = useMapStore((s) => s.activeTool)
  const brushRadius      = useMapStore((s) => s.brushRadius)
  const beginStroke      = useMapStore((s) => s.beginStroke)
  const paintHex         = useMapStore((s) => s.paintHex)
  const endStroke        = useMapStore((s) => s.endStroke)
  const selectHex        = useMapStore((s) => s.selectHex)
  const toggleRiverEdge  = useMapStore((s) => s.toggleRiverEdge)

  const hoverCoord        = useRef<AxialCoord | null>(null)
  const hoverRiverEdge    = useRef<string | null>(null)
  const isRiverDrawing    = useRef(false)
  const riverDrawMode     = useRef<'add' | 'remove'>('add')
  const lastRiverEdgeRef  = useRef<string | null>(null)
  const activeToolRef  = useRef(activeTool)
  const brushRadiusRef = useRef(brushRadius)
  activeToolRef.current  = activeTool
  brushRadiusRef.current = brushRadius

  // Reload underlay image when underlayPath changes
  useEffect(() => {
    if (!map?.underlayPath) {
      underlayImg.current = null
      needsRedraw.current = true
      return
    }
    const img = new Image()
    img.onload = () => {
      underlayImg.current = img
      needsRedraw.current = true
    }
    img.src = map.underlayPath
  }, [map?.underlayPath])

  // Request redraw whenever store state that affects visuals changes
  useEffect(() => {
    needsRedraw.current = true
  }, [map, layers, selectedHex, brushRadius, activeTool])

  // ── Render ───────────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { offsetX, offsetY, zoom } = view.current
    const { hexSize, hexes, width, height } = map

    // Canvas viewport bounds in world space (for culling)
    const viewL = -offsetX / zoom
    const viewT = -offsetY / zoom
    const viewR = (canvas.width - offsetX) / zoom
    const viewB = (canvas.height - offsetY) / zoom
    const cullPad = hexSize * 2

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)

    // ── Underlay ──────────────────────────────────────────────────────────────
    if (layers.underlay && underlayImg.current) {
      // Bounding box for offset-r rectangular grid.
      // Col 0 of even rows → x=0; col 0 of odd rows → x=hSpacing/2 (shifted right).
      // So left edge = -hSpacing/2, total width = width*hSpacing + hSpacing/2 for stagger.
      const hSpacing = Math.sqrt(3) * hexSize
      const x0 = -hSpacing / 2
      const y0 = -hexSize
      const totalW = width * hSpacing + hSpacing / 2
      const totalH = (height - 1) * hexSize * 1.5 + hexSize * 2
      ctx.globalAlpha = 0.45
      ctx.drawImage(underlayImg.current, x0, y0, totalW, totalH)
      ctx.globalAlpha = 1
    }

    // ── Hex terrain fill ──────────────────────────────────────────────────────
    if (layers.terrain) {
      ctx.globalAlpha = 0.55
      for (const hex of Object.values(hexes)) {
        const [cx, cy] = hexToPixel(hex.q, hex.r, hexSize)
        if (cx + cullPad < viewL || cx - cullPad > viewR) continue
        if (cy + cullPad < viewT || cy - cullPad > viewB) continue
        drawHexFill(ctx, cx, cy, hexSize, TERRAIN_COLORS[hex.terrain])
      }
      ctx.globalAlpha = 1
    }

    // ── Grid lines ────────────────────────────────────────────────────────────
    if (layers.grid && zoom > 0.15) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 0.5 / zoom
      for (const hex of Object.values(hexes)) {
        const [cx, cy] = hexToPixel(hex.q, hex.r, hexSize)
        if (cx + cullPad < viewL || cx - cullPad > viewR) continue
        if (cy + cullPad < viewT || cy - cullPad > viewB) continue
        strokeHex(ctx, cx, cy, hexSize)
      }
    }

    // ── Region labels ─────────────────────────────────────────────────────────
    if (layers.regions && zoom > 0.4) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelSize = Math.max(8, hexSize * 0.5)
      ctx.font = `italic ${labelSize}px serif`
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      const seen = new Set<string>()
      for (const hex of Object.values(hexes)) {
        if (!hex.region || seen.has(hex.region)) continue
        seen.add(hex.region)
        const [cx, cy] = hexToPixel(hex.q, hex.r, hexSize)
        if (cx + cullPad < viewL || cx - cullPad > viewR) continue
        if (cy + cullPad < viewT || cy - cullPad > viewB) continue
        ctx.fillText(hex.region, cx, cy)
      }
    }

    // ── Settlements ───────────────────────────────────────────────────────────
    if (layers.settlements) {
      for (const hex of Object.values(hexes)) {
        if (!hex.settlement) continue
        const [cx, cy] = hexToPixel(hex.q, hex.r, hexSize)
        if (cx + cullPad < viewL || cx - cullPad > viewR) continue
        if (cy + cullPad < viewT || cy - cullPad > viewB) continue
        drawSettlement(ctx, cx, cy, hex, hexSize, zoom)
      }
    }

    // ── Rivers ───────────────────────────────────────────────────────────────
    if (layers.rivers && map.rivers?.length) {
      ctx.strokeStyle = '#3b9eff'
      ctx.lineWidth = Math.max(1.5, hexSize * 0.18) / zoom
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const ek of map.rivers) {
        const [a, b] = parseRiverEdge(ek)
        const d = HEX_NEIGHBORS.findIndex(n => n.q === b.q - a.q && n.r === b.r - a.r)
        if (d === -1) continue
        const [cx, cy] = hexToPixel(a.q, a.r, hexSize)
        const corners = hexCorners(cx, cy, hexSize)
        const slot = NEIGHBOR_TO_EDGE_SLOT[d]
        const [x1, y1] = corners[slot]
        const [x2, y2] = corners[(slot + 1) % 6]
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    // ── River edge hover preview (river tool) ─────────────────────────────────
    const hre = hoverRiverEdge.current
    if (hre && activeToolRef.current === 'river') {
      const [a, b] = parseRiverEdge(hre)
      const d = HEX_NEIGHBORS.findIndex(n => n.q === b.q - a.q && n.r === b.r - a.r)
      if (d !== -1) {
        const alreadyRiver = map.rivers?.includes(hre) ?? false
        const [cx, cy] = hexToPixel(a.q, a.r, hexSize)
        const corners = hexCorners(cx, cy, hexSize)
        const slot = NEIGHBOR_TO_EDGE_SLOT[d]
        const [x1, y1] = corners[slot]
        const [x2, y2] = corners[(slot + 1) % 6]
        ctx.strokeStyle = alreadyRiver ? '#ff6666' : '#88ccff'
        ctx.lineWidth = Math.max(2.5, hexSize * 0.25) / zoom
        ctx.lineCap = 'round'
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // ── Selected hex highlight ────────────────────────────────────────────────
    if (selectedHex && hexes[selectedHex]) {
      const h = hexes[selectedHex]
      const [cx, cy] = hexToPixel(h.q, h.r, hexSize)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2 / zoom
      strokeHex(ctx, cx, cy, hexSize)
      ctx.strokeStyle = '#ffcc00'
      ctx.lineWidth = 1 / zoom
      strokeHex(ctx, cx, cy, hexSize * 0.85)
    }

    // ── Brush preview ──────────────────────────────────────────────────────────
    const tool = activeToolRef.current
    const hc   = hoverCoord.current
    if (hc && (tool === 'paint' || tool === 'erase')) {
      const radius = brushRadiusRef.current
      const previewColor = tool === 'erase' ? '#ff6666' : '#ffffff'
      const affected = hexesInRadius(hc.q, hc.r, radius).filter(
        ({ q: pq, r: pr }) => hexKey(pq, pr) in hexes
      )
      ctx.globalAlpha = 0.3
      for (const { q: pq, r: pr } of affected) {
        const [cx, cy] = hexToPixel(pq, pr, hexSize)
        drawHexFill(ctx, cx, cy, hexSize, previewColor)
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = previewColor
      ctx.lineWidth = 1.5 / zoom
      for (const { q: pq, r: pr } of affected) {
        const [cx, cy] = hexToPixel(pq, pr, hexSize)
        strokeHex(ctx, cx, cy, hexSize)
      }
    }

    ctx.restore()
  }, [map, layers, selectedHex])

  // ── RAF loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      if (needsRedraw.current) {
        render()
        needsRedraw.current = false
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [render])

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      needsRedraw.current = true
    })
    ro.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => ro.disconnect()
  }, [])

  // ── Input helpers ─────────────────────────────────────────────────────────────

  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    const { offsetX, offsetY, zoom } = view.current
    return [(sx - offsetX) / zoom, (sy - offsetY) / zoom]
  }, [])

  const hexAtScreen = useCallback(
    (clientX: number, clientY: number) => {
      if (!map) return null
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const [wx, wy] = screenToWorld(clientX - rect.left, clientY - rect.top)
      const coord = pixelToHex(wx, wy, map.hexSize)
      const key = hexKey(coord.q, coord.r)
      return key in map.hexes ? coord : null
    },
    [map, screenToWorld]
  )

  // ── Mouse / wheel events ──────────────────────────────────────────────────────

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!map) return
      if (e.button === 1 || activeTool === 'pan') {
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
        return
      }
      if (e.button === 0) {
        if (activeTool === 'river') {
          const canvas = canvasRef.current
          if (!canvas || !map) return
          const rect = canvas.getBoundingClientRect()
          const [wx, wy] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
          const ek = nearestRiverEdge(wx, wy, map.hexes, map.hexSize)
          if (ek) {
            const alreadyRiver = map.rivers?.includes(ek) ?? false
            riverDrawMode.current = alreadyRiver ? 'remove' : 'add'
            lastRiverEdgeRef.current = ek
            isRiverDrawing.current = true
            toggleRiverEdge(ek)
          }
          return
        }
        if (activeTool === 'paint' || activeTool === 'erase') {
          isPainting.current = true
          beginStroke()
          const coord = hexAtScreen(e.clientX, e.clientY)
          if (coord) paintHex(coord.q, coord.r)
        } else if (activeTool === 'select') {
          const coord = hexAtScreen(e.clientX, e.clientY)
          selectHex(coord ? hexKey(coord.q, coord.r) : null)
          needsRedraw.current = true
        }
      }
    },
    [map, activeTool, beginStroke, hexAtScreen, paintHex, selectHex]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning.current) {
        view.current.offsetX += e.clientX - lastMouse.current.x
        view.current.offsetY += e.clientY - lastMouse.current.y
        lastMouse.current = { x: e.clientX, y: e.clientY }
        needsRedraw.current = true
        return
      }
      // ── River tool ─────────────────────────────────────────────────────────
      if (activeTool === 'river') {
        const canvas = canvasRef.current
        if (!canvas || !map) return
        const rect = canvas.getBoundingClientRect()
        const [wx, wy] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
        const ek = nearestRiverEdge(wx, wy, map.hexes, map.hexSize)
        if (ek !== hoverRiverEdge.current) {
          hoverRiverEdge.current = ek
          needsRedraw.current = true
        }
        if (isRiverDrawing.current && ek && ek !== lastRiverEdgeRef.current) {
          lastRiverEdgeRef.current = ek
          const hasRiver = map.rivers?.includes(ek) ?? false
          if (riverDrawMode.current === 'add' && !hasRiver) toggleRiverEdge(ek)
          if (riverDrawMode.current === 'remove' && hasRiver) toggleRiverEdge(ek)
        }
        return
      }

      const coord = hexAtScreen(e.clientX, e.clientY)
      // Update hover preview
      const prevKey = hoverCoord.current ? hexKey(hoverCoord.current.q, hoverCoord.current.r) : null
      const newKey  = coord ? hexKey(coord.q, coord.r) : null
      if (prevKey !== newKey) {
        hoverCoord.current = coord
        needsRedraw.current = true
      }
      if (isPainting.current && (activeTool === 'paint' || activeTool === 'erase')) {
        if (coord) paintHex(coord.q, coord.r)
      }
    },
    [activeTool, map, hexAtScreen, paintHex, toggleRiverEdge, screenToWorld]
  )

  const onMouseUp = useCallback(() => {
    if (isPainting.current) endStroke()
    isPainting.current = false
    isPanning.current = false
    isRiverDrawing.current = false
    lastRiverEdgeRef.current = null
  }, [endStroke])

  const onMouseLeave = useCallback(() => {
    if (isPainting.current) endStroke()
    isPainting.current = false
    isPanning.current = false
    isRiverDrawing.current = false
    lastRiverEdgeRef.current = null
    if (hoverCoord.current !== null || hoverRiverEdge.current !== null) {
      hoverCoord.current = null
      hoverRiverEdge.current = null
      needsRedraw.current = true
    }
  }, [endStroke])

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.current.zoom * factor))
    // Zoom toward cursor (canvas-relative coords)
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    view.current.offsetX = mx - (mx - view.current.offsetX) * (newZoom / view.current.zoom)
    view.current.offsetY = my - (my - view.current.offsetY) * (newZoom / view.current.zoom)
    view.current.zoom = newZoom
    needsRedraw.current = true
  }, [])

  const cursor =
    activeTool === 'pan'    ? 'grab' :
    activeTool === 'select' ? 'crosshair' :
    activeTool === 'river'  ? 'crosshair' :
    'cell'

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ cursor, background: '#0d1117' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
    />
  )
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function drawHexFill(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const corners = hexCorners(cx, cy, size)
  ctx.beginPath()
  ctx.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i][0], corners[i][1])
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function strokeHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const corners = hexCorners(cx, cy, size)
  ctx.beginPath()
  ctx.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i][0], corners[i][1])
  ctx.closePath()
  ctx.stroke()
}

function drawSettlement(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hex: HexData,
  hexSize: number,
  zoom: number
) {
  const r = SETTLEMENT_DOT_RADIUS[hex.settlementSize ?? 'village']
  ctx.beginPath()
  ctx.arc(cx, cy, r / zoom < 1.5 ? 1.5 / zoom : r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 0.8 / zoom
  ctx.stroke()

  if (zoom > 0.5 && hex.settlement) {
    const fontSize = Math.max(9, hexSize * 0.45)
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5 / zoom
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.strokeText(hex.settlement, cx, cy + r + 2)
    ctx.fillText(hex.settlement, cx, cy + r + 2)
  }
}

// ── River helpers ──────────────────────────────────────────────────────────────

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy)
}

function nearestRiverEdge(
  wx: number, wy: number,
  hexes: Record<string, import('../types/map').HexData>,
  hexSize: number
): string | null {
  const center = pixelToHex(wx, wy, hexSize)
  const candidates = [center, ...HEX_NEIGHBORS.map(n => ({ q: center.q + n.q, r: center.r + n.r }))]
  let bestDist = hexSize * 0.8
  let bestKey: string | null = null
  for (const hex of candidates) {
    if (!(hexKey(hex.q, hex.r) in hexes)) continue
    const [cx, cy] = hexToPixel(hex.q, hex.r, hexSize)
    const corners = hexCorners(cx, cy, hexSize)
    for (let d = 0; d < 6; d++) {
      const nq = hex.q + HEX_NEIGHBORS[d].q
      const nr = hex.r + HEX_NEIGHBORS[d].r
      if (!(hexKey(nq, nr) in hexes)) continue
      const slot = NEIGHBOR_TO_EDGE_SLOT[d]
      const [x1, y1] = corners[slot]
      const [x2, y2] = corners[(slot + 1) % 6]
      const dist = distToSegment(wx, wy, x1, y1, x2, y2)
      if (dist < bestDist) {
        bestDist = dist
        bestKey = riverEdgeKey(hex.q, hex.r, nq, nr)
      }
    }
  }
  return bestKey
}
