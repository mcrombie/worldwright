import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  map: {
    save: (jsonData: string, filePath?: string) =>
      ipcRenderer.invoke('map:save', jsonData, filePath),
    load: () => ipcRenderer.invoke('map:load'),
    chooseImage: () => ipcRenderer.invoke('map:choose-image'),
  },
})
