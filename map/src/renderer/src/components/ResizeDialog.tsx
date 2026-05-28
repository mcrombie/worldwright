import { useState } from 'react'
import { useMapStore } from '../store/mapStore'

interface Props {
  onClose: () => void
}

const MAP_SIZES = [
  { width:  40, height:  28, label: 'Hamlet'    },
  { width:  60, height:  42, label: 'Village'   },
  { width:  80, height:  56, label: 'Town'      },
  { width: 100, height:  70, label: 'County'    },
  { width: 130, height:  90, label: 'Region'    },
  { width: 165, height: 115, label: 'Province'  },
  { width: 205, height: 143, label: 'Kingdom'   },
  { width: 255, height: 178, label: 'Realm'     },
  { width: 310, height: 217, label: 'Continent' },
  { width: 375, height: 262, label: 'World'     },
] as const

function sizeIndexForDims(w: number, h: number): number {
  // Find the smallest preset that fits the given dimensions
  for (let i = 0; i < MAP_SIZES.length; i++) {
    if (MAP_SIZES[i].width >= w && MAP_SIZES[i].height >= h) return i + 1
  }
  return 10
}

export function ResizeDialog({ onClose }: Props) {
  const map       = useMapStore((s) => s.map)
  const resizeMap = useMapStore((s) => s.resizeMap)

  const currentW = map?.width  ?? 0
  const currentH = map?.height ?? 0

  const [mapSize, setMapSize] = useState(() => sizeIndexForDims(currentW, currentH))

  const preset   = MAP_SIZES[mapSize - 1]
  const newWidth  = Math.max(currentW, preset.width)
  const newHeight = Math.max(currentH, preset.height)

  const willShrinkW = preset.width  < currentW
  const willShrinkH = preset.height < currentH
  const willShrink  = willShrinkW || willShrinkH

  const unchanged = newWidth === currentW && newHeight === currentH

  // Visual comparison: draw old and new bounds as proportional boxes
  const PREVIEW_MAX = 180
  const scaleW = PREVIEW_MAX / Math.max(newWidth,  currentW)
  const scaleH = PREVIEW_MAX / Math.max(newHeight, currentH)
  const scale  = Math.min(scaleW, scaleH)
  const oldPxW = Math.round(currentW * scale)
  const oldPxH = Math.round(currentH * scale)
  const newPxW = Math.round(newWidth  * scale)
  const newPxH = Math.round(newHeight * scale)

  function apply() {
    resizeMap(newWidth, newHeight)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-96 flex flex-col gap-5 text-gray-100">
        <h2 className="text-lg font-semibold">Resize Map</h2>

        <div className="text-sm text-gray-400">
          Current size: <span className="text-gray-200">{currentW} × {currentH}</span>
          {' '}({(currentW * currentH).toLocaleString()} hexes)
        </div>

        {/* Size slider */}
        <label className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between items-baseline">
            <span>New size</span>
            <span className="text-indigo-300 font-semibold">
              {mapSize} — {preset.label}
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

        {/* Visual comparison */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Size comparison</span>
          <div className="relative bg-gray-800 rounded p-3 flex items-end justify-start"
               style={{ height: newPxH + 24 + 'px' }}>
            {/* New bounds (background) */}
            <div
              className="absolute bottom-3 left-3 border-2 border-indigo-500/40 bg-indigo-900/20 rounded-sm"
              style={{ width: newPxW, height: newPxH }}
            />
            {/* Old bounds (foreground) */}
            <div
              className="absolute bottom-3 left-3 border-2 border-gray-400 bg-gray-700/50 rounded-sm flex items-center justify-center"
              style={{ width: oldPxW, height: oldPxH }}
            >
              <span className="text-xs text-gray-300 select-none">current</span>
            </div>
          </div>
        </div>

        {/* New dimensions */}
        <div className="text-sm">
          New size:{' '}
          <span className="text-gray-200">{newWidth} × {newHeight}</span>
          {' '}({(newWidth * newHeight).toLocaleString()} hexes)
          {willShrink && (
            <span className="ml-2 text-amber-400 text-xs">
              ⚠ hexes outside bounds will be removed
            </span>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 text-sm rounded font-semibold transition-colors
              ${unchanged
                ? 'bg-gray-700 opacity-40 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500'}`}
            onClick={apply}
            disabled={unchanged}
          >
            {willShrink ? 'Resize' : 'Expand'}
          </button>
        </div>
      </div>
    </div>
  )
}
