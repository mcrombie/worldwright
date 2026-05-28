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
export type Climate    = 'temperate' | 'oceanic' | 'cold' | 'arid' | 'steppe' | 'tropical'
export type CoreStatus = 'homeland' | 'core' | 'frontier'

export interface RegionData {
  name: string
  color: string
  faction?: string
  climate?: Climate
  coreStatus?: CoreStatus
  notes?: string
}

export interface HexData {
  q: number
  r: number
  terrain: TerrainType
  region?: string          // key into MapData.regions
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
  rivers: string[]                       // canonical edge keys: "q1,r1|q2,r2"
  regions: Record<string, RegionData>    // regionId → RegionData
}

export type Tool = 'paint' | 'erase' | 'select' | 'pan' | 'river' | 'region'

export interface LayerVisibility {
  terrain: boolean
  grid: boolean
  regions: boolean
  settlements: boolean
  rivers: boolean
  underlay: boolean
}
