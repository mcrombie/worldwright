import { useState, useEffect } from 'react'
import { HexCanvas } from './components/HexCanvas'
import { Toolbar } from './components/Toolbar'
import { InfoPanel } from './components/InfoPanel'
import { NewMapDialog } from './components/NewMapDialog'
import { useMapStore } from './store/mapStore'
import { MapData } from './types/map'

export default function App() {
  const [showNewDialog, setShowNewDialog] = useState(false)
  const map           = useMapStore((s) => s.map)
  const isDirty       = useMapStore((s) => s.isDirty)
  const currentPath   = useMapStore((s) => s.currentFilePath)
  const history       = useMapStore((s) => s.history)
  const loadMap       = useMapStore((s) => s.loadMap)
  const markSaved     = useMapStore((s) => s.markSaved)
  const undo          = useMapStore((s) => s.undo)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])

  async function handleSave() {
    if (!map) return
    const json = JSON.stringify(map, null, 2)
    const result = await window.electronAPI.map.save(json, currentPath ?? undefined)
    if (!result.canceled && result.filePath) markSaved(result.filePath)
  }

  async function handleLoad() {
    const result = await window.electronAPI.map.load()
    if (!result.canceled && result.data && result.filePath) {
      try {
        const data = JSON.parse(result.data) as MapData
        loadMap(data, result.filePath)
      } catch {
        alert('Failed to parse map file.')
      }
    }
  }

  const title = map
    ? `${map.name}${isDirty ? ' •' : ''} — Azhora Map`
    : 'Azhora Map'

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 select-none">

      {/* ── Menu bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="font-semibold text-indigo-400 mr-2">Azhora Map</span>

        <button
          className="px-3 py-1 text-sm rounded hover:bg-gray-700"
          onClick={() => setShowNewDialog(true)}
        >
          New
        </button>
        <button
          className="px-3 py-1 text-sm rounded hover:bg-gray-700"
          onClick={handleLoad}
        >
          Open
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${isDirty ? 'hover:bg-gray-700' : 'opacity-40 cursor-default'}`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          Save{isDirty ? ' *' : ''}
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${history.length > 0 ? 'hover:bg-gray-700' : 'opacity-40 cursor-default'}`}
          onClick={undo}
          disabled={history.length === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>

        <span className="ml-auto text-xs text-gray-500 truncate max-w-xs">
          {currentPath ?? (map ? 'Unsaved' : '')}
        </span>

        {map && (
          <span className="text-xs text-gray-500">
            {map.width}×{map.height} hexes
          </span>
        )}
      </header>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        <main className="flex-1 relative overflow-hidden">
          {map ? (
            <HexCanvas />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
              <p className="text-lg">No map loaded</p>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                  onClick={() => setShowNewDialog(true)}
                >
                  New Map
                </button>
                <button
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                  onClick={handleLoad}
                >
                  Open Map
                </button>
              </div>
            </div>
          )}
        </main>

        <InfoPanel />
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <footer className="px-4 py-1 text-xs text-gray-500 bg-gray-900 border-t border-gray-800 shrink-0">
        {title} &nbsp;|&nbsp; Scroll to zoom · Middle-click or Pan tool to pan · Click to paint
      </footer>

      {showNewDialog && <NewMapDialog onClose={() => setShowNewDialog(false)} />}
    </div>
  )
}
