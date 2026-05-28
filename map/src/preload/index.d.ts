export interface ElectronAPI {
  map: {
    save: (jsonData: string, filePath?: string) => Promise<{ filePath?: string; canceled?: boolean }>
    load: () => Promise<{ data?: string; filePath?: string; canceled?: boolean }>
    chooseImage: () => Promise<{ dataUrl?: string; filePath?: string; canceled?: boolean }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
