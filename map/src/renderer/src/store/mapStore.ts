import { create } from 'zustand'
import { HexData, MapData, TerrainType, Tool, LayerVisibility } from '../types/map'
import { hexKey, hexesInRadius } from '../lib/hex'

const MAX_HISTORY = 50

interface MapStore {
  map: MapData | null
  currentFilePath: string | null
  selectedHex: string | null
  activeTool: Tool
  activeTerrain: TerrainType
  brushRadius: number
  layers: LayerVisibility
  isDirty: boolean
  history: Record<string, HexData>[]   // each entry = before-state of changed hexes
  strokeBefore: Record<string, HexData> | null  // null = no stroke in progress

  newMap: (name: string, width: number, height: number, hexSize: number) => void
  loadMap: (data: MapData, filePath: string) => void
  setFilePath: (path: string) => void
  beginStroke: () => void
  paintHex: (q: number, r: number) => void
  endStroke: () => void
  undo: () => void
  selectHex: (key: string | null) => void
  updateHex: (key: string, data: Partial<HexData>) => void
  setTool: (tool: Tool) => void
  setTerrain: (terrain: TerrainType) => void
  setBrushRadius: (radius: number) => void
  toggleRiverEdge: (edgeKey: string) => void
  setLayer: (layer: keyof LayerVisibility, visible: boolean) => void
  setUnderlay: (path: string) => void
  markSaved: (filePath: string) => void
}

export const useMapStore = create<MapStore>((set, get) => ({
  map: null,
  currentFilePath: null,
  selectedHex: null,
  activeTool: 'paint',
  activeTerrain: 'plains',
  brushRadius: 0,
  layers: {
    terrain: true,
    grid: true,
    regions: true,
    settlements: true,
    rivers: true,
    underlay: true,
  },
  isDirty: false,
  history: [],
  strokeBefore: null,

  newMap: (name, width, height, hexSize) => {
    const hexes: Record<string, HexData> = {}
    for (let r = 0; r < height; r++) {
      for (let col = 0; col < width; col++) {
        const q = col - Math.floor(r / 2)
        const key = hexKey(q, r)
        hexes[key] = { q, r, terrain: 'ocean' }
      }
    }
    set({
      map: { name, width, height, hexSize, hexes, rivers: [] },
      currentFilePath: null,
      isDirty: true,
      selectedHex: null,
      history: [],
      strokeBefore: null,
    })
  },

  loadMap: (data, filePath) =>
    set({
      map: { rivers: [], ...data },  // default rivers for maps saved before this feature
      currentFilePath: filePath,
      isDirty: false,
      selectedHex: null,
      history: [],
      strokeBefore: null,
    }),

  setFilePath: (path) => set({ currentFilePath: path }),

  beginStroke: () => set({ strokeBefore: {} }),

  paintHex: (q, r) => {
    const { map, activeTerrain, activeTool, brushRadius, strokeBefore } = get()
    if (!map) return
    const newTerrain = activeTool === 'erase' ? 'plains' : activeTerrain
    const updates: Record<string, HexData> = {}
    const newStrokeBefore = strokeBefore ? { ...strokeBefore } : null
    for (const coord of hexesInRadius(q, r, brushRadius)) {
      const key = hexKey(coord.q, coord.r)
      if (key in map.hexes && map.hexes[key].terrain !== newTerrain) {
        // Record original state the first time each hex is touched this stroke
        if (newStrokeBefore && !(key in newStrokeBefore)) {
          newStrokeBefore[key] = map.hexes[key]
        }
        updates[key] = { ...map.hexes[key], terrain: newTerrain }
      }
    }
    if (Object.keys(updates).length === 0) return
    set((state) => ({
      map: state.map
        ? { ...state.map, hexes: { ...state.map.hexes, ...updates } }
        : null,
      strokeBefore: newStrokeBefore,
      isDirty: true,
    }))
  },

  endStroke: () => {
    const { strokeBefore } = get()
    if (!strokeBefore || Object.keys(strokeBefore).length === 0) {
      set({ strokeBefore: null })
      return
    }
    set((state) => ({
      history: [...state.history.slice(-(MAX_HISTORY - 1)), strokeBefore],
      strokeBefore: null,
    }))
  },

  undo: () => {
    const { map, history } = get()
    if (!map || history.length === 0) return
    const before = history[history.length - 1]
    set((state) => ({
      map: state.map
        ? { ...state.map, hexes: { ...state.map.hexes, ...before } }
        : null,
      history: state.history.slice(0, -1),
      isDirty: true,
    }))
  },

  selectHex: (key) => set({ selectedHex: key }),

  updateHex: (key, data) =>
    set((state) => ({
      map: state.map
        ? { ...state.map, hexes: { ...state.map.hexes, [key]: { ...state.map.hexes[key], ...data } } }
        : null,
      isDirty: true,
    })),

  toggleRiverEdge: (edgeKey) =>
    set((state) => {
      if (!state.map) return {}
      const rivers = state.map.rivers ?? []
      const idx = rivers.indexOf(edgeKey)
      return {
        map: {
          ...state.map,
          rivers: idx >= 0 ? rivers.filter((_, i) => i !== idx) : [...rivers, edgeKey],
        },
        isDirty: true,
      }
    }),

  setTool: (tool) => set({ activeTool: tool }),
  setTerrain: (terrain) => set({ activeTerrain: terrain }),
  setBrushRadius: (radius) => set({ brushRadius: radius }),
  setLayer: (layer, visible) =>
    set((state) => ({ layers: { ...state.layers, [layer]: visible } })),
  setUnderlay: (path) =>
    set((state) => ({
      map: state.map ? { ...state.map, underlayPath: path } : null,
      isDirty: true,
    })),
  markSaved: (filePath) => set({ isDirty: false, currentFilePath: filePath }),
}))
