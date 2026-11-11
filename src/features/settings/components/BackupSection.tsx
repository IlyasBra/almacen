import { type ChangeEvent, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { backupFileName, createBackup, parseBackup } from '@/features/backup/backup'
import { type InventorySnapshot } from '@/features/inventory/InventoryContext'
import { useInventory } from '@/features/inventory/useInventory'
import { useI18n } from '@/i18n'
import { downloadTextFile } from '@/lib/download'

interface BackupSectionProps {
  /** Whether the browser promised not to evict the data (null = unknown). */
  isStoragePersistent: boolean | null
}

interface Feedback {
  tone: 'done' | 'error'
  message: string
}

/** Export/import of all data, photos included, as a JSON file. */
export function BackupSection({ isStoragePersistent }: BackupSectionProps) {
  const inventory = useInventory()
  const { t, tn } = useI18n()
  const [pending, setPending] = useState<InventorySnapshot | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)

  const exportBackup = async () => {
    setBusy(true)
    try {
      const now = new Date()
      const backup = await createBackup(
        {
          products: inventory.products,
          movements: inventory.movements,
          categories: inventory.categories,
          photos: await inventory.listPhotos(),
        },
        now,
      )
      downloadTextFile(backupFileName(now), JSON.stringify(backup), 'application/json')
      setFeedback({ tone: 'done', message: t('backup.saved') })
    } catch (error) {
      console.error(error)
      setFeedback({ tone: 'error', message: t('backup.createError') })
    } finally {
      setBusy(false)
    }
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // allows choosing the same file again
    if (!file) return

    setFeedback(null)
    setPending(null)
    const result = parseBackup(await file.text())
    if (result.ok) setPending(result.snapshot)
    else setFeedback({ tone: 'error', message: result.error })
  }

  const restore = async () => {
    if (!pending) return
    setBusy(true)
    const done = await inventory.replaceAll(pending)
    setBusy(false)
    if (done) {
      setPending(null)
      setFeedback({ tone: 'done', message: t('backup.restored') })
    } else {
      setFeedback({ tone: 'error', message: t('backup.restoreError') })
    }
  }

  return (
    <section aria-labelledby="backup-heading" className="space-y-4">
      <h3 id="backup-heading" className="text-base font-semibold">
        {t('backup.title')}
      </h3>
      <div className="space-y-6">
        <section className="space-y-2">
          <h4 className="font-medium">{t('backup.saveTitle')}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('backup.saveDescription', {
              products: tn('count.products', inventory.products.length),
            })}
          </p>
          <Button variant="primary" disabled={busy} onClick={() => void exportBackup()}>
            {t('backup.saveButton')}
          </Button>
        </section>

        <section className="space-y-2">
          <h4 className="font-medium">{t('backup.restoreTitle')}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('backup.restoreDescription')}
          </p>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-lg bg-white px-4 font-medium text-slate-800 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700">
            {t('backup.chooseFile')}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => void chooseFile(event)}
            />
          </label>

          {pending && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm">
                {t('backup.pendingSummary', {
                  products: tn('count.products', pending.products.length),
                  photos: tn('count.photos', pending.photos.length),
                  movements: tn('count.movements', pending.movements.length),
                  current: tn('count.products', inventory.products.length),
                })}
              </p>
              <div className="flex gap-2">
                <Button variant="danger" disabled={busy} onClick={() => void restore()}>
                  {t('backup.replace')}
                </Button>
                <Button
                  onClick={() => {
                    setPending(null)
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </section>

        {feedback?.tone === 'done' && (
          <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {feedback.message}
          </p>
        )}
        {feedback?.tone === 'error' && <Notice tone="error">{feedback.message}</Notice>}

        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isStoragePersistent === true ? t('backup.persistent') : t('backup.notPersistent')}
        </p>
      </div>
    </section>
  )
}
