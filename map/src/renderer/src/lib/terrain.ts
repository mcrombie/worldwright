import { TerrainType } from '../types/map'

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  ocean:       '#1a5c8a',
  coast:       '#4a9bb8',
  plains:      '#c8d878',
  hills:       '#a8a06a',
  forest:      '#4a7c4e',
  deep_forest: '#2d5a32',
  mountain:    '#8b8b8b',
  high_mountain:'#d0d0d0',
  desert:      '#e8c878',
  tundra:      '#a8b8b8',
  wetland:     '#6a9b7c',
}

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  ocean:        'Ocean',
  coast:        'Coast',
  plains:       'Plains',
  hills:        'Hills',
  forest:       'Forest',
  deep_forest:  'Deep Forest',
  mountain:     'Mountain',
  high_mountain:'High Mountain',
  desert:       'Desert',
  tundra:       'Tundra',
  wetland:      'Wetland',
}

export const ALL_TERRAINS: TerrainType[] = [
  'ocean', 'coast', 'plains', 'hills',
  'forest', 'deep_forest', 'mountain', 'high_mountain',
  'desert', 'tundra', 'wetland',
]
