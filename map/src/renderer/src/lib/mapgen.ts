import { HexData, TerrainType } from '../types/map'
import { hexKey } from './hex'

export interface MapGenConfig {
  width:         number
  height:        number
  seed:          number
  seaLevel:      number   // 0.2–0.7
  featureScale:  number   // 0.5–3.0
  mountainRate:  number   // 0–1
  temperature:   number   // 0–1 (cold → hot)
  moisture:      number   // 0–1 (dry → wet)
  islandFalloff: number   // 0–1 (continent → island)
}

// ── noise primitives ──────────────────────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453123
  return n - Math.floor(n)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix,       fy = y - iy
  const ux = smoothstep(fx), uy = smoothstep(fy)
  const a = hash(ix,   iy,   seed)
  const b = hash(ix+1, iy,   seed)
  const c = hash(ix,   iy+1, seed)
  const d = hash(ix+1, iy+1, seed)
  return (a*(1-ux) + b*ux) * (1-uy) + (c*(1-ux) + d*ux) * uy
}

function fbm(x: number, y: number, seed: number, octaves = 6): number {
  let value = 0, amplitude = 0.5, frequency = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    value     += smoothNoise(x * frequency, y * frequency, seed + i * 17) * amplitude
    norm      += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / norm
}

// Ridge noise: sharp crests instead of smooth hills
function ridgeFbm(x: number, y: number, seed: number, octaves = 5): number {
  let value = 0, amplitude = 0.5, frequency = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = smoothNoise(x * frequency, y * frequency, seed + i * 17)
    value     += (1 - Math.abs(n * 2 - 1)) * amplitude
    norm      += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / norm
}

// ── terrain classification ────────────────────────────────────────────────────

function classifyTerrain(
  elevation: number,
  temperature: number,
  moisture: number,
  seaLevel: number,
): TerrainType {
  if (elevation < seaLevel) return 'ocean'

  const land = (elevation - seaLevel) / (1 - seaLevel)  // 0–1 above sea

  if (land < 0.07) return 'coast'
  if (land > 0.78) return 'high_mountain'
  if (land > 0.55) return 'mountain'

  if (temperature < 0.22) return 'tundra'
  if (temperature > 0.72 && moisture < 0.35) return 'desert'

  if (moisture > 0.68) return land > 0.35 ? 'deep_forest' : 'wetland'
  if (moisture > 0.42) return land > 0.28 ? 'forest' : 'plains'
  if (land > 0.32)     return 'hills'
  return 'plains'
}

// ── main generator ────────────────────────────────────────────────────────────

export function generateMap(cfg: MapGenConfig): Record<string, HexData> {
  const { width, height, seed, seaLevel, featureScale,
          mountainRate, temperature: tempBias, moisture: moistBias, islandFalloff } = cfg

  const hexes: Record<string, HexData> = {}
  const BASE_SCALE = 3.5

  for (let r = 0; r < height; r++) {
    for (let col = 0; col < width; col++) {
      const q  = col - Math.floor(r / 2)
      const nx = (col / width)  * BASE_SCALE * featureScale
      const ny = (r   / height) * BASE_SCALE * featureScale

      // island falloff: smoothly push edges below sea level
      const dx   = col / width  - 0.5
      const dy   = r   / height - 0.5
      const dist = Math.sqrt(dx*dx + dy*dy) * 2        // 0 at centre, ~1.4 at corners
      const falloff = Math.pow(Math.min(1, dist), 1.5) * islandFalloff * 0.55

      // elevation: blend smooth terrain with ridge noise
      const baseElev  = fbm(nx, ny, seed)
      const ridgeElev = ridgeFbm(nx * 1.3, ny * 1.3, seed + 500)
      const elevation = Math.max(0, Math.min(1,
        baseElev * (1 - mountainRate * 0.6) + ridgeElev * mountainRate * 0.6 - falloff
      ))

      // temperature: noise + global bias, cooled by high elevation
      const tempNoise  = fbm(nx + 100, ny + 100, seed + 2000, 4)
      const land       = Math.max(0, (elevation - seaLevel) / (1 - seaLevel))
      const elevCool   = land > 0.5 ? (land - 0.5) * 0.6 : 0
      const temperature = Math.max(0, Math.min(1,
        tempNoise * 0.5 + tempBias * 0.5 - elevCool
      ))

      // moisture: noise + global bias
      const moistNoise = fbm(nx + 200, ny + 200, seed + 3000, 4)
      const moisture   = Math.max(0, Math.min(1,
        moistNoise * 0.6 + moistBias * 0.4
      ))

      hexes[hexKey(q, r)] = { q, r, terrain: classifyTerrain(elevation, temperature, moisture, seaLevel) }
    }
  }

  return hexes
}
