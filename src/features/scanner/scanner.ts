import type { ScanView } from './frameDecoder'

/** Linear barcodes found on shop products. QR and similar 2D codes are left out on purpose: they usually link to the maker's website. */
export const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'itf',
  'codabar',
] as const

/** Pause between two frames: about 10 attempts a second keeps the phone cool. */
const FRAME_INTERVAL_MS = 90

/** Zoom asked of cameras that support it: lets the phone stay far enough to focus. */
const PREFERRED_ZOOM = 1.6

export interface ScannerHandle {
  /** Stops the camera and the detection loop. Safe to call more than once. */
  stop: () => void
  /** Turns the flashlight on or off; null when the camera has none it can control. */
  setTorch: ((on: boolean) => Promise<void>) | null
}

export type ScannerErrorKind = 'denied' | 'no-camera' | 'unsupported' | 'failed'

export class ScannerError extends Error {
  readonly kind: ScannerErrorKind

  constructor(kind: ScannerErrorKind, cause?: unknown) {
    super(`Scanner error: ${kind}`, { cause })
    this.name = 'ScannerError'
    this.kind = kind
  }
}

/** Message shown for each kind of camera problem. */
export const SCANNER_ERROR_KEYS = {
  denied: 'scanner.denied',
  'no-camera': 'scanner.noCamera',
  unsupported: 'scanner.unsupported',
  failed: 'scanner.failed',
} as const satisfies Record<ScannerErrorKind, string>

/** The native detector, if this browser has one that reads our formats. */
async function createNativeDetector(): Promise<BarcodeDetector | null> {
  if (!('BarcodeDetector' in window)) return null
  try {
    const supported = await BarcodeDetector.getSupportedFormats()
    const formats = BARCODE_FORMATS.filter((format) => supported.includes(format))
    return formats.length > 0 ? new BarcodeDetector({ formats }) : null
  } catch {
    return null
  }
}

function toScannerError(error: unknown): ScannerError {
  if (error instanceof ScannerError) return error
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return new ScannerError('denied', error)
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return new ScannerError('no-camera', error)
  return new ScannerError('failed', error)
}

/** What the browser reports a camera can do; not every field is in the DOM types. */
interface CameraCapabilities {
  torch?: boolean
  zoom?: { min: number; max: number }
  focusMode?: string[]
}

/** Continuous focus and a little zoom where the camera supports them. */
async function tuneCamera(track: MediaStreamTrack): Promise<CameraCapabilities> {
  const capabilities = (
    typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
  ) as CameraCapabilities
  const advanced: Record<string, unknown>[] = []
  if (capabilities.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' })
  if (capabilities.zoom && capabilities.zoom.max >= PREFERRED_ZOOM) {
    advanced.push({ zoom: Math.max(capabilities.zoom.min, PREFERRED_ZOOM) })
  }
  for (const constraint of advanced) {
    try {
      await track.applyConstraints({ advanced: [constraint] })
    } catch {
      // Not every camera accepts what it advertises; scanning works without it.
    }
  }
  return capabilities
}

/** Draws one part of the frame on `canvas` and returns its size. */
function cropView(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  view: ScanView,
): { width: number; height: number } | null {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return null
  const left = Math.round(sourceWidth * view.x)
  const top = Math.round(sourceHeight * view.y)
  const width = Math.round(sourceWidth * view.w)
  const height = Math.round(sourceHeight * view.h)
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(video, left, top, width, height, 0, 0, width, height)
  return { width, height }
}

/**
 * Opens the back camera in `video` and calls `onCode` once with a barcode
 * it has read twice. Each frame is read a different way in turn: the
 * browser's own detector where there is one (Android), then ZXing on the
 * frame as it is and on a copy with reflections evened out (see
 * frameDecoder). Two matching reads are needed so a reflection cannot
 * produce a wrong code.
 */
export async function startLiveScanner(
  video: HTMLVideoElement,
  onCode: (code: string) => void,
): Promise<ScannerHandle> {
  // Absent outside secure contexts (plain HTTP), despite the type.
  const mediaDevices = (navigator as { mediaDevices?: MediaDevices }).mediaDevices
  if (!mediaDevices?.getUserMedia) throw new ScannerError('unsupported')

  let stream: MediaStream
  try {
    stream = await mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })
  } catch (error) {
    throw toScannerError(error)
  }

  let stopped = false
  // A function, so TypeScript does not assume the value cannot change across awaits.
  const isStopped = () => stopped
  let timer = 0
  const [track] = stream.getVideoTracks()
  const stop = () => {
    if (stopped) return
    stopped = true
    window.clearTimeout(timer)
    for (const item of stream.getTracks()) item.stop()
    video.srcObject = null
  }

  try {
    video.srcObject = stream
    video.muted = true
    video.setAttribute('playsinline', '')
    await video.play()

    const [capabilities, detector, decoder] = await Promise.all([
      track ? tuneCamera(track) : Promise.resolve<CameraCapabilities>({}),
      createNativeDetector(),
      import('./frameDecoder'),
    ])
    const confirmer = new decoder.ReadConfirmer()
    const canvas = document.createElement('canvas')
    let frame = 0

    /** One way of reading per frame, in turn: [code, method] or null. */
    const readFrame = async (): Promise<[string, string] | null> => {
      const step = frame++
      if (detector && step % 2 === 0) {
        const [first] = await detector.detect(video)
        return first
          ? [decoder.normalizeBarcode(first.rawValue, first.format), decoder.NATIVE_METHOD]
          : null
      }
      const turn = detector ? step >> 1 : step
      const plan = decoder.SCAN_PLAN[turn % decoder.SCAN_PLAN.length]
      if (!plan) return null
      const name = plan.preparation
      const whole = plan.whole
      const size = cropView(video, canvas, plan.view)
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!size || !context) return null
      const pixels = context.getImageData(0, 0, size.width, size.height).data
      const gray = decoder.shrinkToWidth(decoder.toGray(pixels, size.width, size.height), 1280)
      const code = decoder.decodeGray(decoder.PREPARATIONS[name](gray))
      return code ? [code, whole ? `${name}-whole` : name] : null
    }

    const tick = async () => {
      if (isStopped()) return
      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const read = await readFrame()
          const confirmed = read ? confirmer.add(read[0], read[1], performance.now()) : null
          if (confirmed && !isStopped()) {
            stop()
            onCode(confirmed)
            return
          }
        }
      } catch {
        // A frame that cannot be read is skipped; the next one usually works.
      }
      if (!isStopped()) timer = window.setTimeout(() => void tick(), FRAME_INTERVAL_MS)
    }
    void tick()

    const setTorch =
      track && capabilities.torch
        ? async (on: boolean) => {
            await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] })
          }
        : null
    return { stop, setTorch }
  } catch (error) {
    stop()
    throw toScannerError(error)
  }
}

/**
 * Reads a barcode from a photo (fallback when the live camera is not
 * available). Resolves to null unless two ways of reading agree.
 */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  try {
    const decoder = await import('./frameDecoder')
    const detector = await createNativeDetector()
    if (detector) {
      try {
        const [first] = await detector.detect(bitmap)
        // The phone's own detector is reliable on a still, sharp photo.
        if (first) return decoder.normalizeBarcode(first.rawValue, first.format)
      } catch {
        // Fall through to ZXing.
      }
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    return decoder.decodeStill(decoder.toGray(pixels, canvas.width, canvas.height))
  } finally {
    bitmap.close()
  }
}
