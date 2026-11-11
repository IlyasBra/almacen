import { Badge, type BadgeTone } from '@/components/ui/Badge'

import { useI18n } from '@/i18n'

import { stockStatusLabel } from '../model'
import { type StockStatus } from '../types'

const TONES: Record<StockStatus, BadgeTone> = { ok: 'success', low: 'warning', out: 'danger' }

export function StockBadge({ status }: { status: StockStatus }) {
  useI18n() // re-render when the language changes
  return <Badge tone={TONES[status]}>{stockStatusLabel(status)}</Badge>
}
