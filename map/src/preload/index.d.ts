// Inline type mirrors of renderer/src/lib/fileIO.ts — kept in sync manually.
// Cannot import from renderer src here (would break ambient declaration scope).
interface _SaveResult   { filePath?: string; canceled?: boolean }
interface _LoadResult   { data?: string; filePath?: string; canceled?: boolean; error?: string }
interface _ImageResult  { dataUrl?: string; filePath?: string; canceled?: boolean }
interface _RecentFile   { path: string; name: string; savedAt: string }
interface _ExampleMeta  { id: string; name: string; description: string }

export interface ElectronAPI {
  map: {
    save:        (jsonData: string, filePath?: string) => Promise<_SaveResult>
    load:        () => Promise<_LoadResult>
    loadByPath:  (path: string)                        => Promise<_LoadResult>
    chooseImage: () => Promise<_ImageResult>
    listRecent:   () => Promise<_RecentFile[]>
    addRecent:    (path: string, name: string)          => Promise<void>
    listExamples: () => Promise<_ExampleMeta[]>
    loadExample:  (id: string)                          => Promise<_LoadResult>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
