export type TerrainType =
  | 'ocean'
  | 'coast'
  | 'plains'
  | 'hills'
  | 'forest'
  | 'deep_forest'
  | 'mountain'
  | 'high_mountain'
  | 'desert'
  | 'tundra'
  | 'wetland'

export type SettlementSize = 'village' | 'town' | 'city' | 'capital'

export interface HexData {
  q: number
  r: number
  terrain: TerrainType
  region?: string
  settlement?: string
  settlementSize?: SettlementSize
  notes?: string
}

export interface MapData {
  name: string
  width: number
  height: number
  hexSize: number
  hexes: Record<string, HexData>
  underlayPath?: string
  rivers: string[]  // canonical edge keys: "q1,r1|q2,r2"
}

export type Tool = 'paint' | 'erase' | 'select' | 'pan' | 'river'

export interface LayerVisibility {
  terrain: boolean
  grid: boolean
  regions: boolean
  settlements: boolean
  rivers: boolean
  underlay: boolean
}
