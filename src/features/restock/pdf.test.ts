import { describe, expect, it } from 'vitest'

import { buildPdf } from './pdf'
import { type PdfGroup, type PdfItem, pageShape } from './restockPdf'
import { wrapText } from './wrapText'

const decode = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

describe('buildPdf', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])
  const pdf = buildPdf([
    { width: 100, height: 200, jpeg },
    { width: 100, height: 200, jpeg },
  ])
  const text = decode(pdf)

  it('is a PDF with one page per picture', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text).toContain('/Width 100 /Height 200')
    expect(text).toContain('/Filter /DCTDecode /Length 9')
  })

  it('has a cross-reference table that points at every object', () => {
    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1])
    expect(text.slice(startxref, startxref + 4)).toBe('xref')
    const entries = text.slice(startxref).split('\n').slice(3)
    const offsets = entries
      .filter((line) => line.endsWith(' n '))
      .map((line) => Number(line.slice(0, 10)))
    expect(offsets).toHaveLength(8)
    offsets.forEach((offset, index) => {
      expect(text.slice(offset, offset + 8)).toBe(`${index + 1} 0 obj\n`.slice(0, 8))
    })
  })

  it('keeps the picture bytes untouched', () => {
    const start = pdf.findIndex(
      (byte, i) => byte === 0xff && pdf[i + 1] === 0xd8 && pdf[i + 2] === 0xff,
    )
    expect([...pdf.slice(start, start + jpeg.length)]).toEqual([...jpeg])
  })
})

describe('wrapText', () => {
  const measure = (value: string) => value.length * 10

  it('keeps short text on one line', () => {
    expect(wrapText('Agua mineral', 200, 2, measure)).toEqual(['Agua mineral'])
  })

  it('wraps at spaces', () => {
    expect(wrapText('Agua mineral con gas', 120, 3, measure)).toEqual(['Agua mineral', 'con gas'])
  })

  it('ends with an ellipsis when it does not fit', () => {
    const lines = wrapText('uno dos tres cuatro cinco seis siete', 80, 2, measure)
    expect(lines).toHaveLength(2)
    expect(lines[1]?.endsWith('…')).toBe(true)
    expect(measure(lines[1] ?? '')).toBeLessThanOrEqual(80)
  })

  it('cuts a word that is wider than a line', () => {
    expect(wrapText('supercalifragilistico', 100, 3, measure)).toEqual([
      'supercalif',
      'ragilistic',
      'o',
    ])
  })
})

describe('pageShape', () => {
  const item = (name: string): PdfItem => ({
    name,
    barcode: '',
    quantity: '1',
    unit: 'unidades',
    photo: null,
  })
  const many = (count: number) => Array.from({ length: count }, (_, i) => item(`P${i}`))

  it('always gives at least one page', () => {
    expect(pageShape([])).toEqual([{ headings: 0, items: 0 }])
  })

  it('puts a heading before each category', () => {
    const groups: PdfGroup[] = [
      { title: 'Bebidas', items: many(2) },
      { title: 'Limpieza', items: many(1) },
    ]
    expect(pageShape(groups)).toEqual([{ headings: 2, items: 3 }])
  })

  it('has no headings when the sheet has no categories', () => {
    expect(pageShape([{ title: null, items: many(3) }])).toEqual([{ headings: 0, items: 3 }])
  })

  it('never leaves a heading alone at the end of a page', () => {
    // 4 rows and a heading fill the first page; the next category must start on page two.
    const pages = pageShape([
      { title: 'A', items: many(4) },
      { title: 'B', items: many(2) },
    ])
    expect(pages).toHaveLength(2)
    expect(pages[0]).toEqual({ headings: 1, items: 4 })
    expect(pages[1]).toEqual({ headings: 1, items: 2 })
  })

  it('keeps every product', () => {
    const pages = pageShape([
      { title: 'A', items: many(9) },
      { title: 'B', items: many(9) },
    ])
    expect(pages.reduce((sum, page) => sum + page.items, 0)).toBe(18)
  })
})
