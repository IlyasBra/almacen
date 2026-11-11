import { Dialog } from '@/components/ui/Dialog'
import { useI18n } from '@/i18n'

import { CategoriesSection } from './CategoriesSection'

/** Category manager opened from the inventory chips. */
export function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onClose={onClose} title={t('categories.title')}>
      <CategoriesSection />
    </Dialog>
  )
}
