import { useState, useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../store/mapStore'
import { generateMap, MapGenConfig } from '../lib/mapgen'
import { TERRAIN_COLORS } from '../lib/terrain'

interface Props {
  onClose: () => void
}

const MAP_SIZES = [
  { width:  40, height:  28, hexSize: 20, label: 'Hamlet'    },  // 1
  { width:  60, height:  42, hexSize: 18, label: 'Village'   },  // 2
  { width:  80, height:  56, hexSize: 16, label: 'Town'       },  // 3
  { width: 100, height:  70, hexSize: 16, label: 'County'    },  // 4
  { width: 130, height:  90, hexSize: 14, label: 'Region'    },  // 5
  { width: 165, height: 115, hexSize: 14, label: 'Province'  },  // 6
  { width: 205, height: 143, hexSize: 12, label: 'Kingdom'   },  // 7
  { width: 255, height: 178, hexSize: 10, label: 'Realm'     },  // 8
  { width: 310, height: 217, hexSize: 10, label: 'Continent' },  // 9
  { width: 375, height: 262, hexSize: 8,  label: 'World'     },  // 10
] as const

const MINIMAP_MAX_W = 260

function Slider({
  label, hint, value, min, max, step, onChange,
}: {
  label: string; hint?: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-0.5 text-sm">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-gray-400 tabular-nums">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        className="w-full accent-indigo-500"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

export function RandomMapDialog({ onClose }: Props) {
  const newMap = useMapStore((s) => s.newMap)

  const [name,          setName]          = useState('My World')
  const [mapSize,       setMapSize]       = useState(3)
  const [seed,          setSeed]          = useState(() => Math.floor(Math.random() * 10000))
  const [seaLevel,      setSeaLevel]      = useState(0.45)
  const [featureScale,  setFeatureScale]  = useState(1.0)
  const [mountainRate,  setMountainRate]  = useState(0.30)
  const [temperature,   setTemperature]   = useState(0.50)
  const [moisture,      setMoisture]      = useState(0.50)
  const [islandFalloff, setIslandFalloff] = useState(0.50)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { width, height, hexSize } = MAP_SIZES[mapSize - 1]

  const config: MapGenConfig = {
    width, height, seed, seaLevel, featureScale,
    mountainRate, temperature, moisture, islandFalloff,
  }

  const renderMinimap = useCallback((cfg: MapGenConfig) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pxPerHex = Math.max(1, Math.min(4, Math.floor(MINIMAP_MAX_W / cfg.width)))
    canvas.width  = cfg.width  * pxPerHex
    canvas.height = cfg.height * pxPerHex
    const ctx = canvas.getContext('2d')!
    const hexes = generateMap(cfg)
    for (const hex of Object.values(hexes)) {
      const col = hex.q + Math.floor(hex.r / 2)
      ctx.fillStyle = TERRAIN_COLORS[hex.terrain]
      ctx.fillRect(col * pxPerHex, hex.r * pxPerHex, pxPerHex, pxPerHex)
    }
  }, [])

  useEffect(() => {
    renderMinimap(config)
  }, [mapSize, seed, seaLevel, featureScale, mountainRate, temperature, moisture, islandFalloff])

  function randomize() {
    setSeed(Math.floor(Math.random() * 10000))
  }

  function generate() {
    const hexes = generateMap(config)
    newMap(name, width, height, hexSize, hexes)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 flex gap-6 text-gray-100 max-h-[90vh] overflow-y-auto">

        {/* ── Left: controls ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 w-64 shrink-0">
          <h2 className="text-lg font-semibold">Random Map</h2>

          {/* Basic settings */}
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              className="bg-gray-800 rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-baseline">
              <span>Size</span>
              <span className="text-indigo-300 font-semibold">
                {mapSize} — {MAP_SIZES[mapSize - 1].label}
              </span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              className="w-full accent-indigo-500"
              value={mapSize}
              onChange={(e) => setMapSize(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 Hamlet</span>
              <span>10 World</span>
            </div>
          </label>

          <div className="border-t border-gray-700" />

          {/* Seed */}
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-center">
              <span>Seed</span>
              <button
                className="text-xs px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600"
                onClick={randomize}
              >
                ↺ Randomize
              </button>
            </div>
            <input
              type="number" min={0} max={99999}
              className="bg-gray-800 rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </div>

          <div className="border-t border-gray-700" />

          {/* Generation sliders */}
          <Slider label="Sea Level"       value={seaLevel}      min={0.2} max={0.7} step={0.01} onChange={setSeaLevel}
            hint="↑ more ocean" />
          <Slider label="Feature Scale"   value={featureScale}  min={0.5} max={3.0} step={0.1}  onChange={setFeatureScale}
            hint="↑ larger continents" />
          <Slider label="Mountains"       value={mountainRate}  min={0}   max={1}   step={0.01} onChange={setMountainRate}
            hint="↑ more ridges" />
          <Slider label="Temperature"     value={temperature}   min={0}   max={1}   step={0.01} onChange={setTemperature}
            hint="0 = cold  →  1 = hot" />
          <Slider label="Moisture"        value={moisture}      min={0}   max={1}   step={0.01} onChange={setMoisture}
            hint="0 = dry  →  1 = wet" />
          <Slider label="Island Falloff"  value={islandFalloff} min={0}   max={1}   step={0.01} onChange={setIslandFalloff}
            hint="0 = continent  →  1 = island" />

          <div className="flex gap-2 justify-end pt-1">
            <button
              className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-semibold"
              onClick={generate}
            >
              Generate
            </button>
          </div>
        </div>

        {/* ── Right: minimap preview ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Preview</span>
          <canvas
            ref={canvasRef}
            className="rounded border border-gray-700"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-xs text-gray-500">
            {width} × {height} = {(width * height).toLocaleString()} hexes
          </p>
        </div>

      </div>
    </div>
  )
}
