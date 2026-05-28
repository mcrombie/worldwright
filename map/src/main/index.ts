import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const EXAMPLES_DIR = app.isPackaged
  ? join(process.resourcesPath, 'examples')
  : join(app.getAppPath(), 'resources', 'examples')

const BUNDLED_EXAMPLES = [
  {
    id: 'azhora',
    name: 'Azhora',
    description: 'The continent of Azhora on the planet Corav — a prototype world-building example with terrain, regions, rivers, and settlements.',
    filename: 'azhora.wwmap',
  },
]

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Worldwright',
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

// ── Map file IPC ──────────────────────────────────────────────────────────────

ipcMain.handle('map:save', async (_, jsonData: string, filePath?: string) => {
  let targetPath = filePath
  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Map',
      defaultPath: 'my-world.wwmap',
      filters: [{ name: 'Worldwright Map', extensions: ['wwmap'] }],
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
    filters: [{ name: 'Worldwright Map', extensions: ['wwmap', 'azmap'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true }
  const raw = readFileSync(result.filePaths[0], 'utf-8')
  return { data: raw, filePath: result.filePaths[0] }
})

ipcMain.handle('map:load-by-path', async (_, path: string) => {
  try {
    const raw = readFileSync(path, 'utf-8')
    return { data: raw, filePath: path }
  } catch {
    return { canceled: true, error: 'File not found or unreadable.' }
  }
})

ipcMain.handle('map:choose-image', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Underlay Image',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true }
  const buf  = readFileSync(result.filePaths[0])
  const ext  = result.filePaths[0].split('.').pop()?.toLowerCase() ?? 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`
  return { dataUrl: `data:${mime};base64,${buf.toString('base64')}`, filePath: result.filePaths[0] }
})

// ── Example maps IPC ──────────────────────────────────────────────────────────

ipcMain.handle('map:list-examples', () =>
  BUNDLED_EXAMPLES.map(({ id, name, description }) => ({ id, name, description }))
)

ipcMain.handle('map:load-example', (_, id: string) => {
  const ex = BUNDLED_EXAMPLES.find(e => e.id === id)
  if (!ex) return { canceled: true, error: 'Unknown example.' }
  try {
    const raw = readFileSync(join(EXAMPLES_DIR, ex.filename), 'utf-8')
    return { data: raw }
  } catch {
    return { canceled: true, error: 'Example file not found.' }
  }
})

// ── Recent files IPC ──────────────────────────────────────────────────────────

interface RecentFile { path: string; name: string; savedAt: string }
const RECENT_MAX = 20

function recentPath() {
  return join(app.getPath('userData'), 'recent.json')
}

function readRecent(): RecentFile[] {
  try {
    const p = recentPath()
    if (!existsSync(p)) return []
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch { return [] }
}

function writeRecent(files: RecentFile[]) {
  try { writeFileSync(recentPath(), JSON.stringify(files), 'utf-8') } catch {}
}

ipcMain.handle('map:list-recent', () => readRecent())

ipcMain.handle('map:add-recent', (_, path: string, name: string) => {
  const files = readRecent().filter(f => f.path !== path)
  files.unshift({ path, name, savedAt: new Date().toISOString() })
  if (files.length > RECENT_MAX) files.length = RECENT_MAX
  writeRecent(files)
})
