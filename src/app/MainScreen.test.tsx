import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createInMemoryRepositories, type Repositories } from '@/db/createRepositories'
import { type Category } from '@/features/categories/types'
import { type Product } from '@/features/products/types'
import type * as ScannerModule from '@/features/scanner/scanner'
import { makeCategory, makeProduct } from '@/test/factories'
import { TestProviders } from '@/test/TestProviders'

import { MainScreen } from './MainScreen'

// The live camera cannot run in tests: the fake scanner "reads" this code.
const scanner = vi.hoisted(() => ({ nextCode: '' }))
vi.mock('@/features/scanner/scanner', async (importOriginal) => {
  const actual = await importOriginal<typeof ScannerModule>()
  return {
    ...actual,
    startLiveScanner: (_video: HTMLVideoElement, onCode: (code: string) => void) => {
      setTimeout(() => {
        onCode(scanner.nextCode)
      }, 0)
      return Promise.resolve({ stop: () => undefined })
    },
  }
})

function renderApp(initial: { products?: Product[]; categories?: Category[] } = {}) {
  const repositories: Repositories = {
    ...createInMemoryRepositories(initial),
    isPersistent: true,
  }
  render(
    <TestProviders repositories={repositories}>
      <MainScreen isPersistent />
    </TestProviders>,
  )
  return { repositories, user: userEvent.setup() }
}

describe('MainScreen', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('creates a product and logs its initial stock', async () => {
    const { user, repositories } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Añadir producto' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo producto' })
    await user.type(within(dialog).getByLabelText('Nombre'), 'Lejía 2 L')
    await user.type(within(dialog).getByLabelText('Cantidad inicial'), '6')
    await user.selectOptions(within(dialog).getByLabelText('Unidad'), 'botellas')
    await user.type(within(dialog).getByLabelText('Avisar cuando queden'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Añadir producto' }))

    expect(await screen.findByRole('dialog', { name: 'Lejía 2 L' })).toBeInTheDocument()
    expect(await repositories.products.list()).toMatchObject([
      { name: 'Lejía 2 L', quantity: 6, unit: 'botellas', minimum: 2 },
    ])
    expect(await repositories.movements.list()).toMatchObject([{ kind: 'new', amount: 6 }])
  })

  it('does not save a product without a name', async () => {
    const { user, repositories } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Nuevo' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo producto' })
    await user.click(within(dialog).getByRole('button', { name: 'Añadir producto' }))

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Escribe un nombre.')
    expect(await repositories.products.list()).toEqual([])
  })

  it('groups quick +/- taps into one movement', async () => {
    const { user, repositories } = renderApp({
      products: [makeProduct({ name: 'Agua', quantity: 10 })],
    })

    await user.click(await screen.findByRole('button', { name: /Agua/ }))
    const dialog = screen.getByRole('dialog', { name: 'Agua' })
    const plus = within(dialog).getByRole('button', { name: 'Añadir uno' })
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)
    await user.click(within(dialog).getByRole('button', { name: 'Quitar uno' }))

    expect(within(dialog).getByTestId('stock-quantity')).toHaveTextContent('12')
    await waitFor(
      async () => {
        expect(await repositories.movements.list()).toMatchObject([
          { kind: 'in', amount: 2, resultingQuantity: 12 },
        ])
      },
      { timeout: 2000 },
    )
    expect(await repositories.products.list()).toMatchObject([{ quantity: 12 }])
  })

  it('takes out a typed amount and refuses more than there is', async () => {
    const { user, repositories } = renderApp({
      products: [makeProduct({ name: 'Arroz', quantity: 5, unit: 'kg' })],
    })

    await user.click(await screen.findByRole('button', { name: /Arroz/ }))
    const dialog = screen.getByRole('dialog', { name: 'Arroz' })
    const amount = within(dialog).getByLabelText('Otra cantidad')

    await user.type(amount, '9')
    await user.click(within(dialog).getByRole('button', { name: 'Sale' }))
    expect(amount).toHaveAccessibleDescription('Solo quedan 5 kg.')

    await user.clear(amount)
    await user.type(amount, '1,5')
    await user.click(within(dialog).getByRole('button', { name: 'Sale' }))

    await waitFor(async () => {
      expect(await repositories.products.list()).toMatchObject([{ quantity: 3.5 }])
    })
    expect(await repositories.movements.list()).toMatchObject([
      { kind: 'out', amount: 1.5, resultingQuantity: 3.5 },
    ])
  })

  it('opens the product when a known code is scanned, then scans the next one', async () => {
    scanner.nextCode = '8410000000001'
    const { user } = renderApp({
      products: [makeProduct({ name: 'Agua', barcode: '8410000000001' })],
    })

    await user.click(await screen.findByRole('button', { name: 'Escanear' }))

    const dialog = await screen.findByRole('dialog', { name: 'Agua' })
    expect(within(dialog).getByText('Modo escaneo · 1 escaneado')).toBeInTheDocument()

    scanner.nextCode = '999'
    await user.click(within(dialog).getByRole('button', { name: 'Escanear siguiente' }))

    const form = await screen.findByRole('dialog', { name: 'Nuevo producto' })
    expect(within(form).getByLabelText('Código de barras')).toHaveValue('999')
    expect(within(form).getByText(/No hay ningún producto con el código/)).toBeInTheDocument()
  })

  it('gives a scanned code to an existing product', async () => {
    scanner.nextCode = '777'
    const { user, repositories } = renderApp({ products: [makeProduct({ name: 'Galletas' })] })

    await user.click(await screen.findByRole('button', { name: 'Escanear' }))
    await user.click(await screen.findByRole('button', { name: 'asígnalo a uno que ya tengas' }))
    const assign = screen.getByRole('dialog', { name: 'Asignar código' })
    await user.click(within(assign).getByRole('button', { name: /Galletas/ }))

    expect(await screen.findByRole('dialog', { name: 'Galletas' })).toBeInTheDocument()
    expect(await repositories.products.list()).toMatchObject([{ barcode: '777' }])
  })

  it('lists products to restock and counts them in the menu', async () => {
    window.location.hash = '#reponer'
    renderApp({
      products: [
        makeProduct({ name: 'Lejía', quantity: 3, minimum: 6 }),
        makeProduct({ name: 'Arroz', quantity: 0 }),
        makeProduct({ name: 'Agua', quantity: 20, minimum: 5 }),
      ],
    })

    const list = await screen.findByRole('list', { name: 'Productos por reponer' })
    const names = within(list)
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(names).toEqual([expect.stringMatching(/Arroz/), expect.stringMatching(/Lejía/)])
    expect(screen.getByRole('link', { name: /Reponer \(2\)/ })).toBeInTheDocument()
  })

  it('filters by category and leaves products without one when it is deleted', async () => {
    const bebidas = makeCategory({ name: 'Bebidas' })
    const { user, repositories } = renderApp({
      categories: [bebidas],
      products: [
        makeProduct({ name: 'Agua', categoryId: bebidas.id }),
        makeProduct({ name: 'Arroz' }),
      ],
    })

    await user.click(await screen.findByRole('button', { name: 'Bebidas' }))
    const list = screen.getByRole('list', { name: 'Productos' })
    expect(within(list).getAllByRole('button')).toHaveLength(1)
    expect(within(list).getByRole('button', { name: /Agua/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar categorías' }))
    const dialog = screen.getByRole('dialog', { name: 'Categorías' })
    await user.click(within(dialog).getByRole('button', { name: 'Borrar Bebidas' }))
    await user.click(within(dialog).getByRole('button', { name: 'Borrar' }))

    await waitFor(async () => {
      expect(await repositories.categories.list()).toEqual([])
    })
    expect(await repositories.products.list()).toMatchObject([
      { name: 'Agua', categoryId: null },
      { name: 'Arroz', categoryId: null },
    ])
  })
})
