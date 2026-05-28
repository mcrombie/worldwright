import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Azhora Map',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('map:new-dialog', async () => {
  // Renderer handles the new-map dialog UI; this is a no-op placeholder
  return {}
})

ipcMain.handle('map:save', async (_, jsonData: string, filePath?: string) => {
  let targetPath = filePath
  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Map',
      defaultPath: 'azhora.azmap',
      filters: [{ name: 'Azhora Map', extensions: ['azmap'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    targetPath = result.filePath
  }
  writeFileSync(targetPath, jsonData, 'utf-8')
  return { filePath: targetPath }
})

ipcMain.handle('map:load', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Map',
    filters: [{ name: 'Azhora Map', extensions: ['azmap'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true }
  const raw = readFileSync(result.filePaths[0], 'utf-8')
  return { data: raw, filePath: result.filePaths[0] }
})

ipcMain.handle('map:choose-image', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Underlay Image',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true }
  // Return as base64 data URL so renderer can load it without file:// protocol issues
  const buf = readFileSync(result.filePaths[0])
  const ext = result.filePaths[0].split('.').pop()?.toLowerCase() ?? 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
  return { dataUrl: `data:${mime};base64,${buf.toString('base64')}`, filePath: result.filePaths[0] }
})
