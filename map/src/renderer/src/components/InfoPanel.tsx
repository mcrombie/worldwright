import { useMapStore } from '../store/mapStore'
import { TERRAIN_LABELS } from '../lib/terrain'
import { SettlementSize } from '../types/map'

const SETTLEMENT_SIZES: SettlementSize[] = ['village', 'town', 'city', 'capital']

export function InfoPanel() {
  const map         = useMapStore((s) => s.map)
  const selectedHex = useMapStore((s) => s.selectedHex)
  const updateHex   = useMapStore((s) => s.updateHex)

  if (!map || !selectedHex || !map.hexes[selectedHex]) {
    return (
      <aside className="w-56 bg-gray-900 text-gray-400 p-4 flex flex-col gap-2 shrink-0">
        <p className="text-xs italic mt-2">Select a hex to see details.</p>
      </aside>
    )
  }

  const hex = map.hexes[selectedHex]

  function field(label: string, content: React.ReactNode) {
    return (
      <div>
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        {content}
      </div>
    )
  }

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-300 border-b border-gray-700 pb-2">
        Hex ({hex.q}, {hex.r})
      </h2>

      {field(
        'Terrain',
        <p className="text-sm">{TERRAIN_LABELS[hex.terrain]}</p>
      )}

      {field(
        'Region',
        <input
          className="w-full bg-gray-800 text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
          value={hex.region ?? ''}
          placeholder="e.g. Mittolo"
          onChange={(e) => updateHex(selectedHex, { region: e.target.value || undefined })}
        />
      )}

      {field(
        'Settlement',
        <input
          className="w-full bg-gray-800 text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
          value={hex.settlement ?? ''}
          placeholder="Settlement name"
          onChange={(e) => updateHex(selectedHex, { settlement: e.target.value || undefined })}
        />
      )}

      {hex.settlement && field(
        'Size',
        <select
          className="w-full bg-gray-800 text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
          value={hex.settlementSize ?? 'village'}
          onChange={(e) => updateHex(selectedHex, { settlementSize: e.target.value as SettlementSize })}
        >
          {SETTLEMENT_SIZES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      )}

      {field(
        'Notes',
        <textarea
          className="w-full bg-gray-800 text-sm rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500 resize-none"
          rows={4}
          value={hex.notes ?? ''}
          placeholder="Lore notes, events…"
          onChange={(e) => updateHex(selectedHex, { notes: e.target.value || undefined })}
        />
      )}
    </aside>
  )
}
