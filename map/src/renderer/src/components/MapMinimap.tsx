import { useEffect, useRef } from 'react'
import type { MapData } from '../types/map'
import { TERRAIN_COLORS } from '../lib/terrain'

interface Props {
  map: MapData
  height: number     // CSS display height in px
  className?: string
}

export function MapMinimap({ map, height, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = map.width
    canvas.height = map.height

    // Pass 1: terrain
    for (const hex of Object.values(map.hexes)) {
      const col = hex.q + Math.floor(hex.r / 2)
      ctx.fillStyle = TERRAIN_COLORS[hex.terrain]
      ctx.fillRect(col, hex.r, 1, 1)
    }

    // Pass 2: region color overlay
    ctx.globalAlpha = 0.5
    for (const hex of Object.values(map.hexes)) {
      if (!hex.region) continue
      const color = map.regions?.[hex.region]?.color
      if (!color) continue
      const col = hex.q + Math.floor(hex.r / 2)
      ctx.fillStyle = color
      ctx.fillRect(col, hex.r, 1, 1)
    }
    ctx.globalAlpha = 1
  }, [map])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ height, width: 'auto', display: 'block', imageRendering: 'pixelated' }}
    />
  )
}
