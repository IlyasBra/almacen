import { Dialog } from '@/components/ui/Dialog'

import { CategoriesSection } from './CategoriesSection'

/** Category manager opened from the inventory chips. */
export function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Categorías">
      <CategoriesSection />
    </Dialog>
  )
}
