import { useMapStore } from '../store/mapStore'
import { ALL_TERRAINS, TERRAIN_COLORS, TERRAIN_LABELS } from '../lib/terrain'
import { Tool, LayerVisibility } from '../types/map'

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'paint', label: 'Paint',  icon: '🖌' },
  { id: 'erase', label: 'Erase',  icon: '⬜' },
  { id: 'river', label: 'River',  icon: '〰️' },
  { id: 'select', label: 'Select', icon: '🔍' },
  { id: 'pan',   label: 'Pan',    icon: '✋' },
]

const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  terrain:     'Terrain',
  grid:        'Grid',
  regions:     'Regions',
  settlements: 'Settlements',
  rivers:      'Rivers',
  underlay:    'Underlay',
}

const BRUSH_SIZES = [
  { radius: 0, hexCount: 1,  dotPx: 5  },
  { radius: 1, hexCount: 7,  dotPx: 9  },
  { radius: 2, hexCount: 19, dotPx: 14 },
  { radius: 3, hexCount: 37, dotPx: 19 },
]

export function Toolbar() {
  const activeTool    = useMapStore((s) => s.activeTool)
  const activeTerrain = useMapStore((s) => s.activeTerrain)
  const brushRadius   = useMapStore((s) => s.brushRadius)
  const layers        = useMapStore((s) => s.layers)
  const setTool       = useMapStore((s) => s.setTool)
  const setTerrain    = useMapStore((s) => s.setTerrain)
  const setBrushRadius = useMapStore((s) => s.setBrushRadius)
  const setLayer      = useMapStore((s) => s.setLayer)
  const setUnderlay   = useMapStore((s) => s.setUnderlay)

  async function chooseUnderlay() {
    const result = await window.electronAPI.map.chooseImage()
    if (!result.canceled && result.dataUrl) {
      setUnderlay(result.dataUrl)
    }
  }

  return (
    <aside className="w-48 flex flex-col gap-4 bg-gray-900 text-gray-100 p-3 overflow-y-auto shrink-0">

      {/* Tools */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Tool</h3>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex flex-col items-center py-2 rounded text-sm transition-colors
                ${activeTool === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-xs mt-1">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Brush size — only for paint/erase, not river */}
      {(activeTool === 'paint' || activeTool === 'erase') && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Brush Size</h3>
          <div className="grid grid-cols-4 gap-1">
            {BRUSH_SIZES.map(({ radius, hexCount, dotPx }) => (
              <button
                key={radius}
                onClick={() => setBrushRadius(radius)}
                title={`${hexCount} hex${hexCount > 1 ? 'es' : ''}`}
                className={`flex flex-col items-center justify-center h-11 rounded transition-colors
                  ${brushRadius === radius
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
              >
                <div className="flex items-center justify-center mb-1" style={{ height: 18 }}>
                  <div
                    className="rounded-full bg-current"
                    style={{ width: dotPx, height: dotPx }}
                  />
                </div>
                <span className="text-xs leading-none">{hexCount}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Terrain palette */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Terrain</h3>
        <div className="flex flex-col gap-1">
          {ALL_TERRAINS.map((t) => (
            <button
              key={t}
              onClick={() => { setTerrain(t); setTool('paint') }}
              className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors
                ${activeTerrain === t && activeTool === 'paint'
                  ? 'ring-2 ring-indigo-400 bg-gray-800'
                  : 'hover:bg-gray-800'}`}
            >
              <span
                className="inline-block w-4 h-4 rounded-sm border border-gray-600 shrink-0"
                style={{ background: TERRAIN_COLORS[t] }}
              />
              <span className="truncate">{TERRAIN_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Layers */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Layers</h3>
        <div className="flex flex-col gap-1">
          {(Object.keys(LAYER_LABELS) as (keyof LayerVisibility)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm hover:text-white">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) => setLayer(key, e.target.checked)}
                className="accent-indigo-500"
              />
              {LAYER_LABELS[key]}
            </label>
          ))}
        </div>
      </section>

      {/* Underlay image */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Underlay</h3>
        <button
          onClick={chooseUnderlay}
          className="w-full text-xs bg-gray-800 hover:bg-gray-700 rounded px-2 py-2 text-left truncate"
        >
          Choose image…
        </button>
      </section>

    </aside>
  )
}
