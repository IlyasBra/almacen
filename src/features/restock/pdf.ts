/** A page that is one JPEG picture covering the whole sheet. */
export interface PdfPage {
  /** Size of the picture in pixels. */
  width: number
  height: number
  /** A baseline JPEG file, RGB. */
  jpeg: Uint8Array
}

/** A4 in PDF points (1/72 inch). */
export const A4_WIDTH_PT = 595.28
export const A4_HEIGHT_PT = 841.89

/**
 * Builds a PDF whose pages are pictures. Pictures keep every alphabet and
 * layout exactly as drawn (Arabic included) without bundling fonts or a PDF
 * library, and every phone opens them the same way.
 */
export function buildPdf(pages: readonly PdfPage[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (part: Uint8Array) => {
    parts.push(part)
    length += part.length
  }
  const text = (value: string) => {
    push(encoder.encode(value))
  }
  const object = (number: number, body: () => void) => {
    offsets[number] = length
    text(`${number} 0 obj\n`)
    body()
    text('endobj\n')
  }

  // Objects: 1 catalog, 2 page list, then page, content and picture for each page.
  const pageObject = (index: number) => 3 + index * 3
  const total = 2 + pages.length * 3

  text('%PDF-1.4\n')
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  object(1, () => {
    text('<< /Type /Catalog /Pages 2 0 R >>\n')
  })
  object(2, () => {
    const kids = pages.map((_, index) => `${pageObject(index)} 0 R`).join(' ')
    text(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`)
  })
  pages.forEach((page, index) => {
    const number = pageObject(index)
    object(number, () => {
      text(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] ` +
          `/Resources << /XObject << /Im0 ${number + 2} 0 R >> >> /Contents ${number + 1} 0 R >>\n`,
      )
    })
    const content = `q ${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm /Im0 Do Q\n`
    object(number + 1, () => {
      text(`<< /Length ${content.length} >>\nstream\n${content}endstream\n`)
    })
    object(number + 2, () => {
      text(
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
      )
      push(page.jpeg)
      text('\nendstream\n')
    })
  })

  const xrefAt = length
  text(`xref\n0 ${total + 1}\n0000000000 65535 f \n`)
  for (let number = 1; number <= total; number++) {
    text(`${String(offsets[number]).padStart(10, '0')} 00000 n \n`)
  }
  text(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let position = 0
  for (const part of parts) {
    out.set(part, position)
    position += part.length
  }
  return out
}
