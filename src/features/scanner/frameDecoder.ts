import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'

/**
 * Barcode reading tuned for shop products, many of them wrapped in shiny
 * plastic. A reflection is a smooth bright patch: it does not erase the bars,
 * it only lowers their contrast. Evening out the brightness of each row
 * ("flattening") gives the bars back their contrast so ZXing can read them.
 *
 * This module is loaded on demand together with ZXing, so it adds nothing
 * to the app's start-up.
 */

/** A grey image: one byte of brightness per pixel. */
export interface GrayImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** RGBA pixels (as from a canvas) to brightness. */
export function toGray(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    // Integer approximation of Rec. 601 luma.
    data[i] = ((rgba[p] ?? 0) * 77 + (rgba[p + 1] ?? 0) * 150 + (rgba[p + 2] ?? 0) * 29) >> 8
  }
  return { data, width, height }
}

/** Darkest and brightest value in a window around each position (O(n) per row). */
function slidingExtremes(
  row: Uint8ClampedArray,
  radius: number,
  out: { min: Uint8ClampedArray; max: Uint8ClampedArray },
) {
  const n = row.length
  const minQueue = new Int32Array(n)
  const maxQueue = new Int32Array(n)
  let minHead = 0
  let minTail = 0
  let maxHead = 0
  let maxTail = 0
  // Index `j` enters the window when it reaches i + radius.
  for (let j = 0; j < n + radius; j++) {
    if (j < n) {
      const value = row[j] ?? 0
      while (minTail > minHead && (row[minQueue[minTail - 1] ?? 0] ?? 0) >= value) minTail--
      minQueue[minTail++] = j
      while (maxTail > maxHead && (row[maxQueue[maxTail - 1] ?? 0] ?? 0) <= value) maxTail--
      maxQueue[maxTail++] = j
    }
    const i = j - radius
    if (i < 0) continue
    while ((minQueue[minHead] ?? 0) < i - radius) minHead++
    while ((maxQueue[maxHead] ?? 0) < i - radius) maxHead++
    out.min[i] = row[minQueue[minHead] ?? 0] ?? 0
    out.max[i] = row[maxQueue[maxHead] ?? 0] ?? 0
  }
}

/** Box blur of a row, to turn the stepped envelopes into smooth ones. */
function smoothRow(values: Uint8ClampedArray, radius: number, out: Float32Array) {
  const n = values.length
  let sum = 0
  for (let j = -radius; j <= radius; j++) sum += values[Math.min(n - 1, Math.max(0, j))] ?? 0
  const size = radius * 2 + 1
  for (let i = 0; i < n; i++) {
    out[i] = sum / size
    sum += (values[Math.min(n - 1, i + radius + 1)] ?? 0) - (values[Math.max(0, i - radius)] ?? 0)
  }
}

/** Below this local range a stretch is just paper texture or sensor noise. */
const MIN_LOCAL_CONTRAST = 18

/**
 * Removes reflections and uneven light. Each row is stretched so that, around
 * every point, the darkest nearby value becomes black and the brightest
 * becomes white. Bars keep their contrast under a reflection; flat areas
 * (quiet zones, background) stay white instead of turning into noise.
 */
export function flattenGlare(image: GrayImage): GrayImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  // About a tenth of the width: wider than the widest bar, narrower than a reflection.
  const radius = Math.max(8, Math.round(width / 20))
  const extremes = { min: new Uint8ClampedArray(width), max: new Uint8ClampedArray(width) }
  const low = new Float32Array(width)
  const high = new Float32Array(width)
  for (let y = 0; y < height; y++) {
    const row = data.subarray(y * width, (y + 1) * width)
    slidingExtremes(row, radius, extremes)
    smoothRow(extremes.min, radius, low)
    smoothRow(extremes.max, radius, high)
    for (let x = 0; x < width; x++) {
      const floor = low[x] ?? 0
      const range = (high[x] ?? 0) - floor
      const value = row[x] ?? 0
      out[y * width + x] =
        range < MIN_LOCAL_CONTRAST ? 255 : Math.round(((value - floor) * 255) / range)
    }
  }
  return { data: out, width, height }
}

/**
 * Averages each pixel with the rows just above and below. Bars are vertical,
 * so this keeps them sharp while cancelling the camera's grain.
 */
export function smoothColumns(image: GrayImage, radius = 4): GrayImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  for (let x = 0; x < width; x++) {
    let sum = 0
    let count = 0
    for (let y = 0; y <= Math.min(radius, height - 1); y++) {
      sum += data[y * width + x] ?? 0
      count++
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / count
      const enter = y + radius + 1
      const leave = y - radius
      if (enter < height) {
        sum += data[enter * width + x] ?? 0
        count++
      }
      if (leave >= 0) {
        sum -= data[leave * width + x] ?? 0
        count--
      }
    }
  }
  return { data: out, width, height }
}

/**
 * Unsharp mask along each row: makes the edges of slightly out-of-focus bars
 * crisp again. Phones cannot focus very close, so this helps a lot.
 */
export function sharpenRows(image: GrayImage, radius = 3, amount = 2): GrayImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y++) {
    const offset = y * width
    let sum = 0
    let count = 0
    for (let x = 0; x <= Math.min(radius, width - 1); x++) {
      sum += data[offset + x] ?? 0
      count++
    }
    for (let x = 0; x < width; x++) {
      const value = data[offset + x] ?? 0
      out[offset + x] = value + amount * (value - sum / count)
      const enter = x + radius + 1
      const leave = x - radius
      if (enter < width) {
        sum += data[offset + enter] ?? 0
        count++
      }
      if (leave >= 0) {
        sum -= data[offset + leave] ?? 0
        count--
      }
    }
  }
  return { data: out, width, height }
}

/**
 * The ways a picture is prepared before reading. Each one fails on different
 * pictures, and they rarely make the same mistake, so a code is trusted only
 * when two of them agree (see ReadConfirmer).
 */
export const PREPARATIONS = {
  /** Reflections evened out. */
  flat: (image: GrayImage) => flattenGlare(image),
  /** Grain removed and edges sharpened, then reflections evened out: for blur. */
  sharp: (image: GrayImage) => flattenGlare(sharpenRows(smoothColumns(image))),
  /** Reflections evened out first, then sharpened: for blur under a reflection. */
  flatSharp: (image: GrayImage) => sharpenRows(flattenGlare(smoothColumns(image)), 3, 1.5),
} as const
export type Preparation = keyof typeof PREPARATIONS

/** A part of the frame, as fractions of its width and height. */
export interface ScanView {
  x: number
  y: number
  w: number
  h: number
}

const VIEWS = {
  band: { x: 0.05, y: 0.275, w: 0.9, h: 0.45 },
  whole: { x: 0, y: 0, w: 1, h: 1 },
  upper: { x: 0.05, y: 0.1, w: 0.9, h: 0.35 },
  lower: { x: 0.05, y: 0.55, w: 0.9, h: 0.35 },
  left: { x: 0, y: 0.25, w: 0.6, h: 0.5 },
  right: { x: 0.4, y: 0.25, w: 0.6, h: 0.5 },
} as const satisfies Record<string, ScanView>

export interface ScanStep {
  preparation: Preparation
  view: ScanView
  /** True when the step reads the whole frame (counted as the same way of reading). */
  whole: boolean
}

/**
 * What each attempt looks at and how, in turn. The middle band comes back
 * often (a code held in the aiming box is read fast); the other parts find a
 * code that sits off-centre, which a small code on a wrinkled wrapper often is.
 * "flat" leads because it was the most reliable on reflections and wrinkles.
 */
export const SCAN_PLAN: readonly ScanStep[] = [
  { preparation: 'flat', view: VIEWS.band, whole: false },
  { preparation: 'flat', view: VIEWS.lower, whole: false },
  { preparation: 'sharp', view: VIEWS.band, whole: false },
  { preparation: 'flat', view: VIEWS.upper, whole: false },
  { preparation: 'flatSharp', view: VIEWS.band, whole: false },
  { preparation: 'flat', view: VIEWS.whole, whole: true },
  { preparation: 'flat', view: VIEWS.left, whole: false },
  { preparation: 'flat', view: VIEWS.right, whole: false },
  { preparation: 'sharp', view: VIEWS.whole, whole: true },
]

/** Halves the size until the image fits `maxWidth`: faster to read, and averages noise. */
export function shrinkToWidth(image: GrayImage, maxWidth: number): GrayImage {
  let current = image
  while (current.width > maxWidth) {
    const width = current.width >> 1
    const height = current.height >> 1
    const data = new Uint8ClampedArray(width * height)
    const source = current.data
    const sourceWidth = current.width
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * 2 * sourceWidth + x * 2
        data[y * width + x] =
          ((source[i] ?? 0) +
            (source[i + 1] ?? 0) +
            (source[i + sourceWidth] ?? 0) +
            (source[i + sourceWidth + 1] ?? 0)) >>
          2
      }
    }
    current = { data, width, height }
  }
  return current
}

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
]

let reader: MultiFormatReader | null = null
function getReader(): MultiFormatReader {
  if (!reader) {
    reader = new MultiFormatReader()
    const hints = new Map<DecodeHintType, unknown>()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS)
    hints.set(DecodeHintType.TRY_HARDER, true)
    reader.setHints(hints)
  }
  return reader
}

export type Binarizer = 'hybrid' | 'global'

/**
 * A UPC-A code is an EAN-13 that starts with 0. Readers return it with 12 or
 * 13 digits depending on the phone; storing the 13-digit form means the same
 * product always gets the same code.
 */
export function normalizeBarcode(code: string, format: string): string {
  const text = code.trim()
  const isUpcA = format === 'upc_a' || format === String(BarcodeFormat.UPC_A)
  return isUpcA && /^\d{12}$/.test(text) ? `0${text}` : text
}

/** One ZXing attempt. `hybrid` copes with uneven light, `global` with blur. */
export function decodeGray(image: GrayImage, binarizer: Binarizer = 'hybrid'): string | null {
  const source = new RGBLuminanceSource(image.data, image.width, image.height)
  const bitmap = new BinaryBitmap(
    binarizer === 'hybrid' ? new HybridBinarizer(source) : new GlobalHistogramBinarizer(source),
  )
  try {
    const result = getReader().decodeWithState(bitmap)
    return normalizeBarcode(result.getText(), String(result.getBarcodeFormat())) || null
  } catch {
    return null
  } finally {
    getReader().reset()
  }
}

/**
 * Reads a still picture (a photo of the code) every way, on the middle band
 * and on the whole picture. Resolves to a code only when two ways agree.
 */
export function decodeStill(image: GrayImage): string | null {
  const whole = shrinkToWidth(image, 1280)
  const bandHeight = Math.round(whole.height * 0.45)
  const top = Math.round((whole.height - bandHeight) / 2)
  const band: GrayImage = {
    data: whole.data.slice(top * whole.width, (top + bandHeight) * whole.width),
    width: whole.width,
    height: bandHeight,
  }
  const confirmer = new ReadConfirmer()
  for (const picture of [band, whole]) {
    for (const [name, prepare] of Object.entries(PREPARATIONS)) {
      const code = decodeGray(prepare(picture))
      const confirmed = code ? confirmer.add(code, name, 0) : null
      if (confirmed) return confirmed
    }
  }
  return null
}

/**
 * Guards against misreads. Blur or a reflection can make one way of reading
 * see a wrong code that still passes the check digit, and see it again on the
 * next frame; two ways can even make the same mistake now and then. So a code
 * is accepted only with enough independent evidence within `windowMs`:
 * - the "flat" reading (the most reliable one) and another way agree, or
 * - "flat" has read it at least twice, in different parts of the picture, and
 *   no other reading of "flat" has given a different code, or
 * - two different ways agree, the code has been read at least three times and
 *   no other code has been read meanwhile (a sign the picture is unclear), or
 * - the phone's own detector has read it twice.
 * Methods ending in "-whole" read the whole frame with the same preparation,
 * so they do not count as a different way.
 */
export class ReadConfirmer {
  private readonly windowMs: number
  private reads: { code: string; method: string; at: number }[] = []

  constructor(windowMs = 4000) {
    this.windowMs = windowMs
  }

  /** Records a read; returns the code once it is confirmed, otherwise null. */
  add(code: string, method: string, now: number): string | null {
    this.reads = this.reads.filter((read) => now - read.at <= this.windowMs)
    this.reads.push({ code, method: method.replace(/-whole$/, ''), at: now })
    const same = this.reads.filter((read) => read.code === code)
    const ways = new Set(same.map((read) => read.method))
    const nativeTwice = same.filter((read) => read.method === NATIVE_METHOD).length >= 2
    const flatAgrees = ways.has('flat') && ways.size >= 2
    const flatReads = this.reads.filter((read) => read.method === 'flat')
    const flatTwice =
      flatReads.filter((read) => read.code === code).length >= 2 &&
      flatReads.every((read) => read.code === code)
    const conflicting = this.reads.some(
      (read) => read.code !== code && read.method !== NATIVE_METHOD,
    )
    const manyReads = ways.size >= 2 && same.length >= 3 && !conflicting
    return nativeTwice || flatAgrees || flatTwice || manyReads ? code : null
  }
}

/** Name of the browser's own detector in ReadConfirmer. */
export const NATIVE_METHOD = 'native'
