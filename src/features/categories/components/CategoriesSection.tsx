import { type SubmitEvent, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDelete } from '@/components/ui/ConfirmDelete'
import { PencilIcon, TrashIcon } from '@/components/ui/icons'
import { inputClassName } from '@/components/ui/styles'
import { useInventory } from '@/features/inventory/useInventory'
import { pluralize } from '@/lib/text'

import { validateCategoryName } from '../model'
import { type Category } from '../types'

/** Create, rename and delete categories. */
export function CategoriesSection() {
  const { categories, products, createCategory, renameCategory, deleteCategory } = useInventory()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string; error: string | null } | null>(
    null,
  )
  const [deleting, setDeleting] = useState<Category | null>(null)
  const id = useId()

  const add = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const problem = validateCategoryName(name, categories)
    setError(problem)
    if (problem) return
    if (await createCategory(name)) setName('')
  }

  const saveRename = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    const others = categories.filter((category) => category.id !== editing.id)
    const problem = validateCategoryName(editing.name, others)
    if (problem) {
      setEditing({ ...editing, error: problem })
      return
    }
    if (await renameCategory(editing.id, editing.name)) setEditing(null)
  }

  const count = (categoryId: string) =>
    products.filter((product) => product.categoryId === categoryId).length

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h3 id={`${id}-heading`} className="text-base font-semibold">
        Categorías
      </h3>

      {deleting ? (
        <ConfirmDelete
          itemName={deleting.name}
          onCancel={() => {
            setDeleting(null)
          }}
          onConfirm={() => {
            void deleteCategory(deleting.id).then(() => {
              setDeleting(null)
            })
          }}
        />
      ) : (
        <>
          <form onSubmit={(event) => void add(event)} noValidate>
            <label htmlFor={`${id}-new`} className="mb-1.5 block text-sm font-medium">
              Nueva categoría
            </label>
            <div className="flex gap-2">
              <input
                id={`${id}-new`}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                }}
                autoComplete="off"
                placeholder="Ej.: Bebidas"
                aria-invalid={error !== null}
                aria-describedby={error ? `${id}-new-error` : undefined}
                className={inputClassName}
              />
              <Button type="submit" variant="primary">
                Añadir
              </Button>
            </div>
            {error && (
              <p id={`${id}-new-error`} className="mt-1.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </form>

          {categories.length > 0 ? (
            <ul className="divide-y divide-slate-200 rounded-xl ring-1 ring-slate-200 dark:divide-slate-700 dark:ring-slate-700">
              {categories.map((category) => (
                <li key={category.id} className="px-3 py-2">
                  {editing?.id === category.id ? (
                    <form onSubmit={(event) => void saveRename(event)} noValidate>
                      <label htmlFor={`${id}-rename`} className="sr-only">
                        Nuevo nombre de {category.name}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={`${id}-rename`}
                          value={editing.name}
                          onChange={(event) => {
                            setEditing({ ...editing, name: event.target.value, error: null })
                          }}
                          aria-invalid={editing.error !== null}
                          aria-describedby={editing.error ? `${id}-rename-error` : undefined}
                          className={inputClassName}
                        />
                        <Button type="submit" variant="primary">
                          Guardar
                        </Button>
                        <Button
                          onClick={() => {
                            setEditing(null)
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                      {editing.error && (
                        <p
                          id={`${id}-rename-error`}
                          className="mt-1.5 text-sm text-red-700 dark:text-red-400"
                        >
                          {editing.error}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium break-words">{category.name}</span>
                        <span className="block text-sm text-slate-600 dark:text-slate-400">
                          {pluralize(count(category.id), 'producto', 'productos')}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing({ id: category.id, name: category.name, error: null })
                        }}
                      >
                        <PencilIcon />
                        <span className="sr-only">Renombrar {category.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-700 dark:text-red-400"
                        onClick={() => {
                          setDeleting(category)
                        }}
                      >
                        <TrashIcon />
                        <span className="sr-only">Borrar {category.name}</span>
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Todavía no hay categorías. Crea las que uses: Bebidas, Limpieza, Alimentación…
            </p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Al borrar una categoría, sus productos se quedan sin categoría; no se borra ninguno.
          </p>
        </>
      )}
    </section>
  )
}
