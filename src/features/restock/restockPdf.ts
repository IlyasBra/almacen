import { buildPdf, type PdfPage } from './pdf'
import { wrapText } from './wrapText'

/** One product on the sheet: what the supplier needs to recognise it, and the stock. */
export interface PdfItem {
  name: string
  barcode: string
  /** Stock already formatted for the reader, e.g. "14". */
  quantity: string
  /** Unit already translated, e.g. "botellas". */
  unit: string
  photo: Blob | null
}

export interface PdfLabels {
  title: string
  /** Date already formatted for the reader. */
  date: string
  barcode: string
  noBarcode: string
  /** Right-to-left languages mirror the layout. */
  rtl: boolean
}

// A4 at 150 dpi.
const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const MARGIN = 90
const HEADER_HEIGHT = 170
const FOOTER_HEIGHT = 60
const ROW_HEIGHT = 250
const PHOTO_SIZE = 200
const GAP = 40
/** Width of the column on the far side that holds the quantity. */
const QUANTITY_WIDTH = 230
const FONT = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** How many rows fit on the first page (with the title) and on the next ones. */
function rowsPerPage(first: boolean): number {
  const room = PAGE_HEIGHT - 2 * MARGIN - FOOTER_HEIGHT - (first ? HEADER_HEIGHT : 0)
  return Math.floor(room / ROW_HEIGHT)
}

/** Items split into pages. */
export function paginate<T>(items: readonly T[]): T[][] {
  const pages: T[][] = []
  let index = 0
  do {
    const size = rowsPerPage(pages.length === 0)
    pages.push(items.slice(index, index + size))
    index += size
  } while (index < items.length)
  return pages
}

async function loadPhoto(blob: Blob | null): Promise<ImageBitmap | null> {
  if (!blob) return null
  try {
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

function drawPhoto(
  context: CanvasRenderingContext2D,
  photo: ImageBitmap | null,
  name: string,
  x: number,
  y: number,
) {
  context.save()
  context.beginPath()
  context.roundRect(x, y, PHOTO_SIZE, PHOTO_SIZE, 24)
  context.clip()
  if (photo) {
    // Fill the square, cutting the sides of the picture that do not fit.
    const side = Math.min(photo.width, photo.height)
    context.drawImage(
      photo,
      (photo.width - side) / 2,
      (photo.height - side) / 2,
      side,
      side,
      x,
      y,
      PHOTO_SIZE,
      PHOTO_SIZE,
    )
  } else {
    context.fillStyle = '#eef2ff'
    context.fillRect(x, y, PHOTO_SIZE, PHOTO_SIZE)
    context.fillStyle = '#4f46e5'
    context.font = `600 72px ${FONT}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.direction = 'ltr'
    context.fillText(
      name.trim().slice(0, 2).toUpperCase() || '?',
      x + PHOTO_SIZE / 2,
      y + PHOTO_SIZE / 2,
    )
  }
  context.restore()
  context.strokeStyle = '#cbd5e1'
  context.lineWidth = 2
  context.beginPath()
  context.roundRect(x, y, PHOTO_SIZE, PHOTO_SIZE, 24)
  context.stroke()
}

function drawRow(
  context: CanvasRenderingContext2D,
  item: PdfItem,
  photo: ImageBitmap | null,
  top: number,
  labels: PdfLabels,
) {
  const { rtl } = labels
  const photoX = rtl ? PAGE_WIDTH - MARGIN - PHOTO_SIZE : MARGIN
  const photoY = top + (ROW_HEIGHT - PHOTO_SIZE) / 2
  drawPhoto(context, photo, item.name, photoX, photoY)

  const textWidth = PAGE_WIDTH - 2 * MARGIN - PHOTO_SIZE - QUANTITY_WIDTH - 2 * GAP
  const textX = rtl ? PAGE_WIDTH - MARGIN - PHOTO_SIZE - GAP : MARGIN + PHOTO_SIZE + GAP
  context.textAlign = rtl ? 'right' : 'left'
  context.textBaseline = 'alphabetic'
  context.direction = rtl ? 'rtl' : 'ltr'

  context.font = `700 42px ${FONT}`
  const lines = wrapText(item.name, textWidth, 2, (value) => context.measureText(value).width)
  const blockHeight = lines.length * 52 + 14 + 30 + 46
  let y = top + (ROW_HEIGHT - blockHeight) / 2 + 40
  context.fillStyle = '#0f172a'
  for (const line of lines) {
    context.fillText(line, textX, y)
    y += 52
  }

  y += 14
  context.font = `500 26px ${FONT}`
  context.fillStyle = '#64748b'
  context.fillText(labels.barcode, textX, y)
  y += 46
  // Digits are always read left to right, even in Arabic.
  context.direction = 'ltr'
  context.font = item.barcode
    ? `600 40px ui-monospace, "SF Mono", Menlo, Consolas, monospace`
    : `500 34px ${FONT}`
  context.fillStyle = item.barcode ? '#0f172a' : '#94a3b8'
  // The "no barcode" note is a sentence, so it follows the language direction.
  if (!item.barcode) context.direction = rtl ? 'rtl' : 'ltr'
  context.fillText(item.barcode || labels.noBarcode, textX, y)

  // Quantity at the far end, big, with its unit under it. Digits always read left to right.
  const quantityX = rtl ? MARGIN : PAGE_WIDTH - MARGIN
  const middle = top + ROW_HEIGHT / 2
  context.textAlign = rtl ? 'left' : 'right'
  context.direction = 'ltr'
  context.fillStyle = '#0f172a'
  context.font = `700 64px ${FONT}`
  context.fillText(item.quantity, quantityX, middle + 8)
  context.direction = rtl ? 'rtl' : 'ltr'
  context.fillStyle = '#64748b'
  context.font = `500 28px ${FONT}`
  const [unitLine = ''] = wrapText(
    item.unit,
    QUANTITY_WIDTH,
    1,
    (value) => context.measureText(value).width,
  )
  context.fillText(unitLine, quantityX, middle + 52)

  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(MARGIN, top + ROW_HEIGHT)
  context.lineTo(PAGE_WIDTH - MARGIN, top + ROW_HEIGHT)
  context.stroke()
}

function drawHeader(context: CanvasRenderingContext2D, labels: PdfLabels) {
  const { rtl } = labels
  context.textAlign = rtl ? 'right' : 'left'
  context.textBaseline = 'alphabetic'
  context.direction = rtl ? 'rtl' : 'ltr'
  const x = rtl ? PAGE_WIDTH - MARGIN : MARGIN
  context.fillStyle = '#0f172a'
  context.font = `700 60px ${FONT}`
  context.fillText(labels.title, x, MARGIN + 60)
  context.fillStyle = '#64748b'
  context.font = `500 30px ${FONT}`
  context.fillText(labels.date, x, MARGIN + 110)
}

function drawFooter(context: CanvasRenderingContext2D, page: number, pages: number) {
  if (pages < 2) return
  context.fillStyle = '#94a3b8'
  context.font = `500 26px ${FONT}`
  context.textAlign = 'center'
  context.direction = 'ltr'
  context.fillText(`${page} / ${pages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN / 2)
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode the page'))
          return
        }
        void blob.arrayBuffer().then((buffer) => {
          resolve(new Uint8Array(buffer))
        }, reject)
      },
      'image/jpeg',
      0.88,
    )
  })
}

/** The supplier sheet: a photo, the name and the barcode number of each product. */
export async function createRestockPdf(
  items: readonly PdfItem[],
  labels: PdfLabels,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  const sheets = paginate(items)
  const pages: PdfPage[] = []
  for (const [index, sheet] of sheets.entries()) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    if (index === 0) drawHeader(context, labels)
    const photos = await Promise.all(sheet.map((item) => loadPhoto(item.photo)))
    let top = MARGIN + (index === 0 ? HEADER_HEIGHT : 0)
    for (const [row, item] of sheet.entries()) {
      drawRow(context, item, photos[row] ?? null, top, labels)
      top += ROW_HEIGHT
    }
    for (const photo of photos) photo?.close()
    drawFooter(context, index + 1, sheets.length)
    pages.push({ width: PAGE_WIDTH, height: PAGE_HEIGHT, jpeg: await toJpeg(canvas) })
  }
  return new Blob([buildPdf(pages)], { type: 'application/pdf' })
}
