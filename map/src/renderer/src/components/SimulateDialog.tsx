import { useState } from 'react'

interface Props {
  initialFactionCount: number
  onStartNew: (factionCount: number) => void
  onLoadSaved: () => void
  onClose: () => void
}

export function SimulateDialog({ initialFactionCount, onStartNew, onLoadSaved, onClose }: Props) {
  const [factionCount, setFactionCount] = useState(initialFactionCount)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 p-6 flex flex-col gap-5">
        <h2 className="text-base font-semibold text-gray-100">Start Simulation</h2>

        {/* New simulation */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300 shrink-0">Factions</label>
            <select
              className="flex-1 px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm"
              value={factionCount}
              onChange={(e) => setFactionCount(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n} factions</option>
              ))}
            </select>
          </div>
          <button
            className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            onClick={() => onStartNew(factionCount)}
          >
            New Simulation
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="flex-1 h-px bg-gray-800" />
          or
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Load saved */}
        <button
          className="w-full px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
          onClick={onLoadSaved}
        >
          Load Saved Simulation…
        </button>

        <button
          className="text-xs text-gray-600 hover:text-gray-400 self-center"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
