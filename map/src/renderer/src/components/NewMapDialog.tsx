import { useState } from 'react'
import { useMapStore } from '../store/mapStore'
import { fileIO } from '../lib/fileIO'

interface Props {
  onClose: () => void
}

interface ImageMeta {
  dataUrl: string
  imgWidth: number
  imgHeight: number
}

const SQRT3 = Math.sqrt(3)

function calcDims(hexSize: number, imgW: number, imgH: number) {
  return {
    width: Math.max(10, Math.round(imgW / (hexSize * SQRT3))),
    height: Math.max(10, Math.round(imgH / (hexSize * 1.5))),
  }
}

export function NewMapDialog({ onClose }: Props) {
  const [name, setName]     = useState('Azhora')
  const [hexSize, setHexSize] = useState(16)
  const [width, setWidth]   = useState(200)
  const [height, setHeight] = useState(150)
  const [image, setImage]   = useState<ImageMeta | null>(null)
  const [autoFit, setAutoFit] = useState(true)

  const newMap      = useMapStore((s) => s.newMap)
  const setUnderlay = useMapStore((s) => s.setUnderlay)

  async function chooseImage() {
    const result = await fileIO.chooseImage()
    if (result.canceled || !result.dataUrl) return
    const img = new Image()
    img.onload = () => {
      const meta: ImageMeta = {
        dataUrl: result.dataUrl!,
        imgWidth: img.naturalWidth,
        imgHeight: img.naturalHeight,
      }
      setImage(meta)
      setAutoFit(true)
      const dims = calcDims(hexSize, img.naturalWidth, img.naturalHeight)
      setWidth(dims.width)
      setHeight(dims.height)
    }
    img.src = result.dataUrl!
  }

  function handleHexSize(size: number) {
    setHexSize(size)
    if (image && autoFit) {
      const dims = calcDims(size, image.imgWidth, image.imgHeight)
      setWidth(dims.width)
      setHeight(dims.height)
    }
  }

  function resetAspect() {
    if (!image) return
    setAutoFit(true)
    const dims = calcDims(hexSize, image.imgWidth, image.imgHeight)
    setWidth(dims.width)
    setHeight(dims.height)
  }

  function create() {
    newMap(name, width, height, hexSize)
    if (image) setUnderlay(image.dataUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-96 flex flex-col gap-4 text-gray-100">
        <h2 className="text-lg font-semibold">New Map</h2>

        {/* Name */}
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="bg-gray-800 rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* Underlay image */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Underlay image</span>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 shrink-0"
              onClick={chooseImage}
            >
              Choose image…
            </button>
            <span className="text-xs text-gray-400 truncate">
              {image ? `${image.imgWidth} × ${image.imgHeight} px` : 'No image — can add later'}
            </span>
          </div>
          {image && (
            <img
              src={image.dataUrl}
              className="w-full h-32 object-cover rounded border border-gray-700"
              alt="Underlay preview"
            />
          )}
        </div>

        {/* Hex density slider */}
        <label className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>Hex size</span>
            <span className="text-gray-400 tabular-nums">{hexSize} px</span>
          </div>
          <input
            type="range" min={4} max={48} step={2}
            className="w-full accent-indigo-500"
            value={hexSize}
            onChange={(e) => handleHexSize(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>← more hexes (dense)</span>
            <span>(sparse) fewer →</span>
          </div>
        </label>

        {/* Width / Height */}
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Width (hexes)
              <input
                type="number" min={10} max={500}
                className="bg-gray-800 rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
                value={width}
                onChange={(e) => { setWidth(Number(e.target.value)); setAutoFit(false) }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Height (hexes)
              <input
                type="number" min={10} max={500}
                className="bg-gray-800 rounded px-2 py-1 outline-none focus:ring-1 ring-indigo-500"
                value={height}
                onChange={(e) => { setHeight(Number(e.target.value)); setAutoFit(false) }}
              />
            </label>
          </div>
          {image && !autoFit && (
            <button
              className="text-xs text-indigo-400 hover:text-indigo-300 text-left mt-0.5"
              onClick={resetAspect}
            >
              ↺ Reset to match image aspect ratio
            </button>
          )}
          {image && autoFit && (
            <p className="text-xs text-gray-500">Grid auto-fitted to image aspect ratio</p>
          )}
        </div>

        <p className="text-xs text-gray-400">
          {width} × {height} = <span className="text-gray-300">{(width * height).toLocaleString()}</span> hexes
        </p>

        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-indigo-600 hover:bg-indigo-500 font-semibold"
            onClick={create}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
