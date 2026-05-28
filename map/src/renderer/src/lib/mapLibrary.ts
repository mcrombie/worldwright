import type { MapData } from '../types/map'

export interface LibraryMeta {
  id: string
  name: string
  width: number
  height: number
  savedAt: string  // ISO string
}

const META_KEY   = 'azhora_lib_meta'
const DATA_KEY   = (id: string) => `azhora_lib_data_${id}`
const AUTO_KEY   = 'azhora_lib_autosave'
const MAX        = 10

function readMeta(): LibraryMeta[] {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? '[]') }
  catch { return [] }
}

function writeMeta(entries: LibraryMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(entries))
}

export function listLibrary(): LibraryMeta[] {
  return readMeta()
}

export function saveToLibrary(map: MapData, id?: string): string {
  const entryId = id ?? crypto.randomUUID()
  const meta: LibraryMeta = {
    id: entryId,
    name: map.name,
    width: map.width,
    height: map.height,
    savedAt: new Date().toISOString(),
  }

  const metas = readMeta().filter(e => e.id !== entryId)
  metas.unshift(meta)

  if (metas.length > MAX) {
    const evicted = metas.splice(MAX)
    evicted.forEach(e => { try { localStorage.removeItem(DATA_KEY(e.id)) } catch {} })
  }

  try {
    localStorage.setItem(DATA_KEY(entryId), JSON.stringify(map))
    writeMeta(metas)
  } catch {
    // Storage full: try evicting the oldest entry to make room
    const oldest = metas.pop()
    if (oldest) { try { localStorage.removeItem(DATA_KEY(oldest.id)) } catch {} }
    localStorage.setItem(DATA_KEY(entryId), JSON.stringify(map))
    writeMeta(metas)
  }

  return entryId
}

export function loadFromLibrary(id: string): MapData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY(id))
    return raw ? JSON.parse(raw) as MapData : null
  } catch { return null }
}

export function deleteFromLibrary(id: string) {
  try { localStorage.removeItem(DATA_KEY(id)) } catch {}
  writeMeta(readMeta().filter(e => e.id !== id))
}

export function autoSave(json: string) {
  try { localStorage.setItem(AUTO_KEY, json) } catch {}
}

export function loadAutoSave(): string | null {
  try { return localStorage.getItem(AUTO_KEY) } catch { return null }
}
