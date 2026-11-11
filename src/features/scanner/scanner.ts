/** Formats found on shop products and labels. */
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
  'qr_code',
  'data_matrix',
] as const

/** Time between two detection attempts with the native detector. */
const NATIVE_SCAN_INTERVAL_MS = 150

export interface ScannerHandle {
  /** Stops the camera and the detection loop. Safe to call more than once. */
  stop: () => void
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

/**
 * Opens the back camera in `video` and calls `onCode` once with the first
 * barcode it sees. Uses the browser's own detector where there is one
 * (fast, Android) and ZXing elsewhere (iPhone). ZXing is loaded on demand.
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
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
  } catch (error) {
    throw toScannerError(error)
  }

  let stopped = false
  // A function, so TypeScript does not assume the value cannot change across awaits.
  const isStopped = () => stopped
  let found = false
  let stopDecoder: () => void = () => undefined
  const stop = () => {
    if (stopped) return
    stopped = true
    stopDecoder()
    for (const track of stream.getTracks()) track.stop()
    video.srcObject = null
  }
  const report = (code: string) => {
    if (found || stopped || code.trim() === '') return
    found = true
    stop()
    onCode(code.trim())
  }

  try {
    video.srcObject = stream
    video.muted = true
    video.setAttribute('playsinline', '')
    await video.play()

    const detector = await createNativeDetector()
    if (detector) {
      let timer = 0
      const tick = async () => {
        if (stopped) return
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const [first] = await detector.detect(video)
            if (first) report(first.rawValue)
          }
        } catch {
          // A frame that cannot be read is skipped; the next one usually works.
        }
        if (!isStopped()) timer = window.setTimeout(() => void tick(), NATIVE_SCAN_INTERVAL_MS)
      }
      stopDecoder = () => {
        window.clearTimeout(timer)
      }
      void tick()
    } else {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 500,
      })
      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (result) report(result.getText())
      })
      stopDecoder = () => {
        controls.stop()
      }
      if (isStopped()) controls.stop()
    }
  } catch (error) {
    stop()
    throw toScannerError(error)
  }

  return { stop }
}

/**
 * Reads a barcode from a photo (fallback when the live camera is not
 * available). Resolves to null when no code is found.
 */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const detector = await createNativeDetector()
  if (detector) {
    try {
      const bitmap = await createImageBitmap(file)
      try {
        const [first] = await detector.detect(bitmap)
        if (first) return first.rawValue.trim()
      } finally {
        bitmap.close()
      }
    } catch {
      // Fall through to ZXing.
    }
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const url = URL.createObjectURL(file)
  try {
    const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url)
    return result.getText().trim()
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
