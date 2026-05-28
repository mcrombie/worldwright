// Pointy-top hexagonal grid using axial coordinates (q, r).
// Reference: https://www.redblobgames.com/grids/hexagons/

export interface AxialCoord {
  q: number
  r: number
}

const SQRT3 = Math.sqrt(3)

/** Convert axial hex coord to pixel center. */
export function hexToPixel(q: number, r: number, size: number): [number, number] {
  const x = size * (SQRT3 * q + (SQRT3 / 2) * r)
  const y = size * (1.5 * r)
  return [x, y]
}

/** Convert pixel position to nearest axial hex coord. */
export function pixelToHex(x: number, y: number, size: number): AxialCoord {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size
  const r = ((2 / 3) * y) / size
  return hexRound(q, r)
}

/** Round fractional axial coordinates to nearest hex. */
export function hexRound(fq: number, fr: number): AxialCoord {
  const fs = -fq - fr
  let rq = Math.round(fq)
  let rr = Math.round(fr)
  let rs = Math.round(fs)
  const dq = Math.abs(rq - fq)
  const dr = Math.abs(rr - fr)
  const ds = Math.abs(rs - fs)
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return { q: rq, r: rr }
}

/** Get the 6 corner pixel positions of a pointy-top hex. */
export function hexCorners(cx: number, cy: number, size: number): [number, number][] {
  const corners: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30) // pointy-top starts at -30°
    corners.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)])
  }
  return corners
}

/** Encode axial coords as a stable string key. */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`
}

/** Decode a hex key back to axial coords. */
export function parseHexKey(key: string): AxialCoord {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

/** Width of the bounding box for a pointy-top hex. */
export function hexWidth(size: number): number {
  return SQRT3 * size
}

/** Height of the bounding box for a pointy-top hex. */
export function hexHeight(size: number): number {
  return 2 * size
}

/** Horizontal spacing between hex centers in the same row. */
export function hexHSpacing(size: number): number {
  return SQRT3 * size
}

/** Vertical spacing between hex center rows. */
export function hexVSpacing(size: number): number {
  return 1.5 * size
}

/**
 * Canonical edge key for the border shared by two adjacent hexes.
 * Always sorts the two keys so the same edge has the same string regardless of traversal direction.
 */
export function riverEdgeKey(q1: number, r1: number, q2: number, r2: number): string {
  const a = hexKey(q1, r1)
  const b = hexKey(q2, r2)
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Parse a river edge key back to the two hex coords. */
export function parseRiverEdge(key: string): [AxialCoord, AxialCoord] {
  const [a, b] = key.split('|')
  return [parseHexKey(a), parseHexKey(b)]
}

/**
 * Maps HEX_NEIGHBORS[d] direction index to the edge "slot" for that hex.
 * Edge slot s uses corners[s] → corners[(s+1)%6] of the hex.
 * Derived from pointy-top corner layout: corner 0 = upper-right, going clockwise.
 */
export const NEIGHBOR_TO_EDGE_SLOT = [0, 5, 4, 3, 2, 1] as const

/** All hex coords within axial distance `radius` of center (q, r). */
export function hexesInRadius(q: number, r: number, radius: number): AxialCoord[] {
  const results: AxialCoord[] = []
  for (let dq = -radius; dq <= radius; dq++) {
    const drMin = Math.max(-radius, -dq - radius)
    const drMax = Math.min(radius, -dq + radius)
    for (let dr = drMin; dr <= drMax; dr++) {
      results.push({ q: q + dq, r: r + dr })
    }
  }
  return results
}

/** Six axial neighbor offsets. */
export const HEX_NEIGHBORS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
]
