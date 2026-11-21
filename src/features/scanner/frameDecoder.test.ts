import { describe, expect, it } from 'vitest'

import {
  decodeGray,
  decodeStill,
  flattenGlare,
  type GrayImage,
  normalizeBarcode,
  NATIVE_METHOD,
  ReadConfirmer,
  SCAN_PLAN,
} from './frameDecoder'

// EAN-13 encoding tables, to draw real barcodes for the tests.
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]
const G = L.map((code) =>
  Array.from(code)
    .map((bit) => (bit === '0' ? '1' : '0'))
    .reverse()
    .join(''),
)
const R = L.map((code) =>
  Array.from(code)
    .map((bit) => (bit === '0' ? '1' : '0'))
    .join(''),
)
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
]

function ean13(first12: string): { code: string; bits: string } {
  const digits = Array.from(first12).map(Number)
  const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0)
  const code = first12 + String((10 - (sum % 10)) % 10)
  const d = Array.from(code).map(Number)
  const parity = PARITY[d[0] ?? 0] ?? ''
  const left = d
    .slice(1, 7)
    .map((digit, i) => (parity[i] === 'L' ? L : G)[digit])
    .join('')
  const right = d
    .slice(7)
    .map((digit) => R[digit])
    .join('')
  return { code, bits: `101${left}01010${right}101` }
}

/**
 * Draws the barcode with low ink contrast and a soft reflection over its
 * middle, like a shiny plastic wrapper under a shop light.
 */
function shinyBarcode(bits: string, glare: boolean): GrayImage {
  const module = 4
  const width = (bits.length + 30) * module
  const height = 160
  const data = new Uint8ClampedArray(width * height)
  const centre = width / 2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = bits[Math.floor(x / module) - 15]
      let value = bit === '1' ? 70 : 230
      if (glare) {
        const reflection = Math.exp(-(((x - centre) / (width * 0.12)) ** 2))
        value += (255 - value) * 0.8 * reflection
      }
      data[y * width + x] = value
    }
  }
  return { data, width, height }
}

describe('frame decoder', () => {
  const { code, bits } = ean13('841234567890')

  it('reads a barcode under a reflection once it is evened out', () => {
    const picture = shinyBarcode(bits, true)
    expect(decodeGray(picture)).toBeNull()
    expect(decodeGray(flattenGlare(picture))).toBe(code)
  })

  it('reads a still photo only when two ways agree', () => {
    expect(decodeStill(shinyBarcode(bits, true))).toBe(code)
    expect(decodeStill(shinyBarcode(bits, false))).toBe(code)
  })

  it('stores UPC-A codes with 13 digits', () => {
    expect(normalizeBarcode('012345678905', 'upc_a')).toBe('0012345678905')
    expect(normalizeBarcode('8412345678905', 'ean_13')).toBe('8412345678905')
  })
})

describe('read confirmer', () => {
  it('accepts the flat reading when another way agrees', () => {
    const confirmer = new ReadConfirmer()
    expect(confirmer.add('111', 'flat', 0)).toBeNull()
    expect(confirmer.add('111', 'sharp', 100)).toBe('111')
  })

  it('does not trust a single flat reading', () => {
    const confirmer = new ReadConfirmer()
    expect(confirmer.add('111', 'flat', 0)).toBeNull()
  })

  it('does not trust two sharpened readings while another code is also being read', () => {
    const confirmer = new ReadConfirmer()
    confirmer.add('999', 'sharp', 0)
    confirmer.add('111', 'flatSharp', 100)
    confirmer.add('111', 'sharp-whole', 200)
    expect(confirmer.add('111', 'flatSharp', 300)).toBeNull()
  })

  it('accepts two sharpened readings when nothing else is seen', () => {
    const confirmer = new ReadConfirmer()
    confirmer.add('111', 'sharp', 0)
    confirmer.add('111', 'flatSharp', 100)
    expect(confirmer.add('111', 'sharp', 200)).toBe('111')
  })

  it('trusts the phone detector after two frames and forgets old reads', () => {
    const confirmer = new ReadConfirmer(1000)
    expect(confirmer.add('222', NATIVE_METHOD, 0)).toBeNull()
    expect(confirmer.add('222', NATIVE_METHOD, 100)).toBe('222')
    expect(confirmer.add('333', 'flat', 0)).toBeNull()
    expect(confirmer.add('333', 'sharp', 5000)).toBeNull()
  })

  it('trusts the flat reading when it sees the same code twice in different places', () => {
    const confirmer = new ReadConfirmer()
    expect(confirmer.add('444', 'flat', 0)).toBeNull()
    expect(confirmer.add('444', 'flat-whole', 300)).toBe('444')
  })

  it('does not trust two flat readings if flat has also read another code', () => {
    const confirmer = new ReadConfirmer()
    confirmer.add('555', 'flat', 0)
    confirmer.add('444', 'flat', 100)
    expect(confirmer.add('444', 'flat', 200)).toBeNull()
  })
})

describe('formats', () => {
  it('reads only linear barcodes, never QR or other 2D codes', async () => {
    const { BARCODE_FORMATS } = await import('./scanner')
    expect(BARCODE_FORMATS).not.toContain('qr_code')
    expect(BARCODE_FORMATS).not.toContain('data_matrix')
    expect(BARCODE_FORMATS).toContain('ean_13')
  })
})

describe('SCAN_PLAN', () => {
  it('stays inside the frame and leads with the flat reading', () => {
    expect(SCAN_PLAN[0]?.preparation).toBe('flat')
    for (const { view } of SCAN_PLAN) {
      expect(view.x).toBeGreaterThanOrEqual(0)
      expect(view.y).toBeGreaterThanOrEqual(0)
      expect(view.x + view.w).toBeLessThanOrEqual(1)
      expect(view.y + view.h).toBeLessThanOrEqual(1)
    }
  })
})
