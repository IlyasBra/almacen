import {
  type ChangeEvent,
  type SubmitEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDelete } from '@/components/ui/ConfirmDelete'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { BarcodeIcon, CameraIcon, ImageIcon, TrashIcon } from '@/components/ui/icons'
import { Notice } from '@/components/ui/Notice'
import { inputClassName } from '@/components/ui/styles'
import { validateCategoryName } from '@/features/categories/model'
import { type PhotoChange } from '@/features/inventory/InventoryContext'
import { useInventory } from '@/features/inventory/useInventory'
import { usePhotoUrl } from '@/features/photos/usePhotoUrl'
import { resizeImage } from '@/features/photos/resizeImage'
import { ScannerDialog } from '@/features/scanner/ScannerDialog'

import { formatAmount, parseAmount, type ProductInputErrors, validateProductInput } from '../model'
import { type Product, type ProductInput, UNITS, type Unit } from '../types'

export type ProductFormState =
  { mode: 'create'; barcode?: string; fromScan?: boolean } | { mode: 'edit'; product: Product }

interface ProductFormDialogProps {
  state: ProductFormState | null
  onClose: () => void
  /** Called with the saved product (new or edited). */
  onSaved: (product: Product) => void
  onDeleted: () => void
  /** The scanned code belongs to a product that already exists. */
  onAssignInstead: (barcode: string) => void
}

export function ProductFormDialog({
  state,
  onClose,
  onSaved,
  onDeleted,
  onAssignInstead,
}: ProductFormDialogProps) {
  return (
    <Dialog
      open={state !== null}
      onClose={onClose}
      title={state?.mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}
    >
      {state && (
        <ProductForm
          // A new key resets the form for each product or new scan.
          key={state.mode === 'edit' ? state.product.id : `new-${state.barcode ?? ''}`}
          state={state}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onAssignInstead={onAssignInstead}
        />
      )}
    </Dialog>
  )
}

const NEW_CATEGORY = '__new'
const NO_CATEGORY = ''

interface Draft {
  name: string
  barcode: string
  category: string
  newCategory: string
  unit: Unit
  quantity: string
  minimum: string
  location: string
  notes: string
}

function initialDraft(state: ProductFormState): Draft {
  if (state.mode === 'edit') {
    const { product } = state
    return {
      name: product.name,
      barcode: product.barcode,
      category: product.categoryId ?? NO_CATEGORY,
      newCategory: '',
      unit: product.unit,
      quantity: formatAmount(product.quantity).replace(/\./g, ''),
      minimum: product.minimum > 0 ? formatAmount(product.minimum).replace(/\./g, '') : '',
      location: product.location,
      notes: product.notes,
    }
  }
  return {
    name: '',
    barcode: state.barcode ?? '',
    category: NO_CATEGORY,
    newCategory: '',
    unit: 'unidades',
    quantity: '',
    minimum: '',
    location: '',
    notes: '',
  }
}

function ProductForm({
  state,
  onSaved,
  onDeleted,
  onAssignInstead,
}: Omit<ProductFormDialogProps, 'state' | 'onClose'> & { state: ProductFormState }) {
  const inventory = useInventory()
  const editing = state.mode === 'edit' ? state.product : null
  const [draft, setDraft] = useState<Draft>(() => initialDraft(state))
  const [errors, setErrors] = useState<ProductInputErrors & { newCategory?: string }>({})
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const storedPhotoUrl = usePhotoUrl(editing?.photoId ?? null)
  const id = useId()

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

  const shownPhoto =
    photo.kind === 'replace' ? photoPreview : photo.kind === 'remove' ? null : storedPhotoUrl

  const set =
    (key: keyof Draft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      // Every field holds text; the unit select only offers valid units.
      setDraft((current) => ({ ...current, [key]: value }))
    }

  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setPhotoError(null)
    try {
      const blob = await resizeImage(file)
      setPhoto({ kind: 'replace', blob })
      setPhotoPreview(URL.createObjectURL(blob))
    } catch (error) {
      console.error(error)
      setPhotoError('No se ha podido abrir la foto. Prueba con otra.')
    }
  }

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const others = inventory.products.filter((product) => product.id !== editing?.id)
    const input: ProductInput = {
      name: draft.name,
      barcode: draft.barcode,
      categoryId:
        draft.category === NO_CATEGORY || draft.category === NEW_CATEGORY ? null : draft.category,
      unit: draft.unit,
      quantity: parseAmount(draft.quantity),
      minimum: parseAmount(draft.minimum),
      location: draft.location,
      notes: draft.notes,
      photoId: editing?.photoId ?? null,
    }
    const nextErrors: ProductInputErrors & { newCategory?: string } = validateProductInput(
      input,
      others,
    )
    if (draft.category === NEW_CATEGORY) {
      const categoryError = validateCategoryName(draft.newCategory, inventory.categories)
      if (categoryError) nextErrors.newCategory = categoryError
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    if (draft.category === NEW_CATEGORY) {
      const category = await inventory.createCategory(draft.newCategory)
      if (!category) {
        setSaving(false)
        return
      }
      input.categoryId = category.id
    }

    if (editing) {
      const done = await inventory.updateProduct(editing.id, input, photo)
      setSaving(false)
      if (done) onSaved({ ...editing, ...input })
    } else {
      const created = await inventory.createProduct(
        input,
        photo.kind === 'replace' ? photo.blob : null,
      )
      setSaving(false)
      if (created) onSaved(created)
    }
  }

  if (confirmingDelete && editing) {
    return (
      <ConfirmDelete
        itemName={editing.name}
        onCancel={() => {
          setConfirmingDelete(false)
        }}
        onConfirm={() => {
          void inventory.deleteProduct(editing.id).then((done) => {
            if (done) onDeleted()
          })
        }}
      />
    )
  }

  const errorId = (field: string) => `${id}-${field}-error`

  return (
    <>
      <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
        {state.mode === 'create' && state.fromScan && state.barcode && (
          <Notice tone="warning">
            No hay ningún producto con el código <span className="font-mono">{state.barcode}</span>.
            Créalo aquí o{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                onAssignInstead(state.barcode ?? '')
              }}
            >
              asígnalo a uno que ya tengas
            </button>
            .
          </Notice>
        )}

        <div className="flex items-center gap-3">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400">
            {shownPhoto ? (
              <img src={shownPhoto} alt="Foto del producto" className="size-full object-cover" />
            ) : (
              <CameraIcon className="size-8" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <PhotoButton label="Hacer foto" capture onChange={(event) => void pickPhoto(event)}>
              <CameraIcon />
            </PhotoButton>
            <PhotoButton label="Elegir de la galería" onChange={(event) => void pickPhoto(event)}>
              <ImageIcon />
            </PhotoButton>
            {shownPhoto && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 dark:text-red-400"
                onClick={() => {
                  setPhoto(editing?.photoId ? { kind: 'remove' } : { kind: 'keep' })
                }}
              >
                <TrashIcon className="size-4" />
                Quitar foto
              </Button>
            )}
          </div>
        </div>
        {photoError && <Notice tone="error">{photoError}</Notice>}

        <Field label="Nombre" htmlFor={`${id}-name`} errorId={errorId('name')} error={errors.name}>
          <input
            id={`${id}-name`}
            value={draft.name}
            onChange={set('name')}
            autoComplete="off"
            placeholder="Ej.: Agua mineral 1,5 L"
            aria-invalid={errors.name !== undefined}
            aria-describedby={errors.name ? errorId('name') : undefined}
            className={inputClassName}
          />
        </Field>

        <Field
          label="Código de barras"
          htmlFor={`${id}-barcode`}
          errorId={errorId('barcode')}
          error={errors.barcode}
        >
          <div className="flex gap-2">
            <input
              id={`${id}-barcode`}
              value={draft.barcode}
              onChange={set('barcode')}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Escanéalo o escríbelo"
              aria-invalid={errors.barcode !== undefined}
              aria-describedby={errors.barcode ? errorId('barcode') : undefined}
              className={inputClassName}
            />
            <Button
              onClick={() => {
                setScanning(true)
              }}
            >
              <BarcodeIcon />
              Escanear
            </Button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={editing ? 'Cantidad actual' : 'Cantidad inicial'}
            htmlFor={`${id}-quantity`}
            errorId={errorId('quantity')}
            error={errors.quantity}
          >
            <input
              id={`${id}-quantity`}
              value={draft.quantity}
              onChange={set('quantity')}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-invalid={errors.quantity !== undefined}
              aria-describedby={errors.quantity ? errorId('quantity') : undefined}
              className={inputClassName}
            />
          </Field>
          <Field label="Unidad" htmlFor={`${id}-unit`} errorId={errorId('unit')}>
            <select
              id={`${id}-unit`}
              value={draft.unit}
              onChange={set('unit')}
              className={inputClassName}
            >
              {UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Avisar cuando queden"
          htmlFor={`${id}-minimum`}
          errorId={errorId('minimum')}
          error={errors.minimum}
        >
          <input
            id={`${id}-minimum`}
            value={draft.minimum}
            onChange={set('minimum')}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej.: 5 (vacío para no avisar)"
            aria-invalid={errors.minimum !== undefined}
            aria-describedby={errors.minimum ? errorId('minimum') : `${id}-minimum-hint`}
            className={inputClassName}
          />
          <p
            id={`${id}-minimum-hint`}
            className="mt-1.5 text-xs text-slate-600 dark:text-slate-400"
          >
            Con esa cantidad o menos aparece en «Reponer».
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría" htmlFor={`${id}-category`} errorId={errorId('newCategory')}>
            <select
              id={`${id}-category`}
              value={draft.category}
              onChange={set('category')}
              className={inputClassName}
            >
              <option value={NO_CATEGORY}>Sin categoría</option>
              {inventory.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>+ Nueva categoría…</option>
            </select>
          </Field>
          <Field label="Ubicación" htmlFor={`${id}-location`} errorId={errorId('location')}>
            <input
              id={`${id}-location`}
              value={draft.location}
              onChange={set('location')}
              autoComplete="off"
              placeholder="Ej.: Estantería 2"
              className={inputClassName}
            />
          </Field>
        </div>

        {draft.category === NEW_CATEGORY && (
          <Field
            label="Nombre de la nueva categoría"
            htmlFor={`${id}-new-category`}
            errorId={errorId('newCategory')}
            error={errors.newCategory}
          >
            <input
              id={`${id}-new-category`}
              value={draft.newCategory}
              onChange={set('newCategory')}
              autoComplete="off"
              placeholder="Ej.: Bebidas"
              aria-invalid={errors.newCategory !== undefined}
              aria-describedby={errors.newCategory ? errorId('newCategory') : undefined}
              className={inputClassName}
            />
          </Field>
        )}

        <Field label="Notas" htmlFor={`${id}-notes`} errorId={errorId('notes')}>
          <textarea
            id={`${id}-notes`}
            value={draft.notes}
            onChange={set('notes')}
            rows={2}
            placeholder="Proveedor, caducidad, lo que quieras recordar"
            className={inputClassName}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={saving} className="justify-center">
            {editing ? 'Guardar cambios' : 'Añadir producto'}
          </Button>
          {editing && (
            <Button
              variant="ghost"
              className="justify-center text-red-700 dark:text-red-400"
              onClick={() => {
                setConfirmingDelete(true)
              }}
            >
              Borrar producto
            </Button>
          )}
        </div>
      </form>

      <ScannerDialog
        open={scanning}
        onClose={() => {
          setScanning(false)
        }}
        onDetected={(code) => {
          setScanning(false)
          setDraft((current) => ({ ...current, barcode: code }))
        }}
      />
    </>
  )
}

function PhotoButton({
  label,
  capture = false,
  onChange,
  children,
}: {
  label: string
  capture?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  children: ReactNode
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-4 font-medium text-slate-800 ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700">
      {children}
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
        className="sr-only"
        onChange={onChange}
      />
    </label>
  )
}
