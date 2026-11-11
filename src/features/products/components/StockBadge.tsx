import { Badge, type BadgeTone } from '@/components/ui/Badge'

import { STOCK_STATUS_LABELS } from '../model'
import { type StockStatus } from '../types'

const TONES: Record<StockStatus, BadgeTone> = { ok: 'success', low: 'warning', out: 'danger' }

export function StockBadge({ status }: { status: StockStatus }) {
  return <Badge tone={TONES[status]}>{STOCK_STATUS_LABELS[status]}</Badge>
}
