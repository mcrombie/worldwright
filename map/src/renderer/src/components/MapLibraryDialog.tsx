import { useState, useMemo } from 'react'
import type { MapData } from '../types/map'
import type { RecentFile } from '../lib/fileIO'
import { IS_BROWSER, fileIO } from '../lib/fileIO'
import { listLibrary, loadFromLibrary, deleteFromLibrary, type LibraryMeta } from '../lib/mapLibrary'
import { MapMinimap } from './MapMinimap'

interface Props {
  onClose: () => void
  onLoad: (data: MapData, id: string) => void
  recentFiles?: RecentFile[]
  onBrowse?: () => void
}

function LibraryCard({
  entry, onLoad, onDelete,
}: {
  entry: LibraryMeta
  onLoad: (data: MapData, id: string) => void
  onDelete: (id: string) => void
}) {
  const mapData = useMemo(() => loadFromLibrary(entry.id), [entry.id])

  async function handleExport() {
    if (!mapData) return
    await fileIO.saveMap(JSON.stringify(mapData, null, 2), mapData.name)
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
      <div className="bg-gray-950 flex items-center justify-center overflow-hidden" style={{ height: 80 }}>
        {mapData
          ? <MapMinimap map={mapData} height={80} />
          : <span className="text-xs text-gray-600">No preview</span>
        }
      </div>
      <div className="px-3 pt-2 pb-1 flex-1">
        <p className="text-sm font-medium truncate">{entry.name}</p>
        <p className="text-xs text-gray-500">
          {entry.width}×{entry.height} &nbsp;·&nbsp; {new Date(entry.savedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-1 px-3 pb-3 pt-1">
        <button
          onClick={() => mapData && onLoad(mapData, entry.id)}
          disabled={!mapData}
          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded px-2 py-1"
        >
          Load
        </button>
        <button
          onClick={handleExport}
          disabled={!mapData}
          className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded px-2 py-1"
          title="Export as file"
        >
          ↓
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="text-xs text-gray-500 hover:text-red-400 px-1"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function MapLibraryDialog({ onClose, onLoad, recentFiles, onBrowse }: Props) {
  const [entries, setEntries] = useState<LibraryMeta[]>(() => IS_BROWSER ? listLibrary() : [])

  function handleDelete(id: string) {
    deleteFromLibrary(id)
    setEntries(listLibrary())
  }

  async function handleImport() {
    const result = await fileIO.loadMap()
    if (!result.canceled && result.data && result.filePath) {
      try {
        onLoad(JSON.parse(result.data) as MapData, result.filePath)
        onClose()
      } catch {
        alert('Failed to parse map file.')
      }
    }
  }

  async function handleRecentOpen(rf: RecentFile) {
    const result = await fileIO.loadByPath(rf.path)
    if (result.error) { alert(result.error); return }
    if (!result.canceled && result.data && result.filePath) {
      try {
        onLoad(JSON.parse(result.data) as MapData, result.filePath)
        onClose()
      } catch {
        alert('Failed to parse map file.')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-[640px] max-h-[80vh] flex flex-col gap-4 text-gray-100">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Open Map</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* ── Browser: library grid ── */}
        {IS_BROWSER && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {entries.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">
                No saved maps yet. Create a map and click Save.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {entries.map(entry => (
                  <LibraryCard
                    key={entry.id}
                    entry={entry}
                    onLoad={(data, id) => { onLoad(data, id); onClose() }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Electron: recent files list ── */}
        {!IS_BROWSER && (
          <div className="flex-1 overflow-y-auto min-h-0">
            {recentFiles === undefined ? (
              <p className="text-sm text-gray-500 text-center py-12">Loading recent files…</p>
            ) : recentFiles.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No recent files.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentFiles.map(rf => (
                  <div key={rf.path} className="flex items-center gap-3 px-3 py-2 rounded bg-gray-800 hover:bg-gray-750">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rf.name}</p>
                      <p className="text-xs text-gray-500 truncate">{rf.path}</p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">
                      {new Date(rf.savedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRecentOpen(rf)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 rounded px-3 py-1 shrink-0"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2 border-t border-gray-800">
          <button
            onClick={IS_BROWSER ? handleImport : onBrowse}
            className="text-sm bg-gray-700 hover:bg-gray-600 rounded px-4 py-2"
          >
            {IS_BROWSER ? 'Import from file…' : 'Browse for file…'}
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-3 py-2">
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}
