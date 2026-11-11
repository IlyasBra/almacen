import { useCallback, useEffect, useRef, useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { MainNav } from '@/components/layout/MainNav'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarcodeIcon, PlusIcon, SettingsIcon } from '@/components/ui/icons'
import { Notice } from '@/components/ui/Notice'
import { CategoriesDialog } from '@/features/categories/components/CategoriesDialog'
import { useInventory } from '@/features/inventory/useInventory'
import { MovementsView } from '@/features/movements/components/MovementsView'
import { AssignBarcodeDialog } from '@/features/products/components/AssignBarcodeDialog'
import { InventoryView } from '@/features/products/components/InventoryView'
import { ProductDialog } from '@/features/products/components/ProductDialog'
import {
  ProductFormDialog,
  type ProductFormState,
} from '@/features/products/components/ProductFormDialog'
import {
  EMPTY_PRODUCT_FILTER,
  findByBarcode,
  type ProductFilter,
  restockList,
} from '@/features/products/selectors'
import { type Product } from '@/features/products/types'
import { RestockView } from '@/features/restock/RestockView'
import { ScannerDialog } from '@/features/scanner/ScannerDialog'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'
import { useTheme } from '@/features/settings/useTheme'
import { useHashRoute } from '@/hooks/useHashRoute'
import { usePersistentStorage } from '@/hooks/usePersistentStorage'

import { DEFAULT_ROUTE, NAV_ITEMS, ROUTES } from './routes'

interface MainScreenProps {
  isPersistent: boolean
}

export function MainScreen({ isPersistent }: MainScreenProps) {
  const route = useHashRoute(ROUTES, DEFAULT_ROUTE)
  const inventory = useInventory()
  const theme = useTheme()
  const isStoragePersistent = usePersistentStorage()

  const [filter, setFilter] = useState<ProductFilter>(EMPTY_PRODUCT_FILTER)
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState | null>(null)
  const [assignCode, setAssignCode] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  /** Number of codes read in the current scanning session; null when not scanning. */
  const [scanCount, setScanCount] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  useScrollToTopOnRouteChange(route)

  const productsRef = useRef(inventory.products)
  useEffect(() => {
    productsRef.current = inventory.products
  }, [inventory.products])

  const startScan = useCallback(() => {
    setOpenProductId(null)
    setForm(null)
    setScanCount((count) => count ?? 0)
    setScannerOpen(true)
  }, [])

  const finishScan = useCallback(() => {
    setScanCount(null)
    setOpenProductId(null)
    setForm(null)
  }, [])

  const onCodeDetected = useCallback((code: string) => {
    setScannerOpen(false)
    setScanCount((count) => (count ?? 0) + 1)
    const product = findByBarcode(productsRef.current, code)
    if (product) setOpenProductId(product.id)
    else setForm({ mode: 'create', barcode: code, fromScan: true })
  }, [])

  const openProduct = useCallback((product: Product) => {
    setScanCount(null)
    setOpenProductId(product.id)
  }, [])

  const restockCount = restockList(inventory.products).length
  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'reponer' && restockCount > 0
      ? { ...item, label: `Reponer (${String(restockCount)})` }
      : item,
  )

  return (
    <AppShell
      nav={<MainNav items={navItems} currentId={route} />}
      headerActions={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSettingsOpen(true)
          }}
          className="-mr-2"
        >
          <SettingsIcon />
          <span className="sr-only">Ajustes</span>
        </Button>
      }
    >
      <div className="mb-5 space-y-3 empty:hidden">
        {!isPersistent && (
          <Notice tone="warning">
            Este navegador no permite guardar datos: lo que apuntes se perderá al cerrar la app.
          </Notice>
        )}
        {inventory.error && (
          <Notice tone="error" onDismiss={inventory.dismissError}>
            {inventory.error} Inténtalo de nuevo.
          </Notice>
        )}
      </div>

      {inventory.status === 'loading' && (
        <p className="text-slate-600 dark:text-slate-400">Cargando…</p>
      )}
      {inventory.status === 'error' && (
        <EmptyState
          title="No se han podido cargar tus datos"
          description="Recarga la página. Si el problema sigue, revisa el espacio libre del móvil."
        />
      )}
      {inventory.status === 'ready' && (
        <>
          <h1 className="sr-only">
            {route === 'inventario'
              ? 'Inventario'
              : route === 'reponer'
                ? 'Por reponer'
                : 'Movimientos'}
          </h1>
          {route === 'inventario' && (
            <InventoryView
              filter={filter}
              onFilterChange={setFilter}
              onOpen={openProduct}
              onCreate={() => {
                setForm({ mode: 'create' })
              }}
              onManageCategories={() => {
                setCategoriesOpen(true)
              }}
            />
          )}
          {route === 'reponer' && <RestockView onOpen={openProduct} />}
          {route === 'movimientos' && <MovementsView />}

          <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 md:bottom-8">
            <Button
              onClick={() => {
                setScanCount(null)
                setForm({ mode: 'create' })
              }}
              className="h-14 rounded-full pr-5 pl-4 shadow-lg"
            >
              <PlusIcon />
              Nuevo
            </Button>
            <Button
              variant="primary"
              onClick={startScan}
              className="h-14 rounded-full pr-5 pl-4 shadow-lg"
            >
              <BarcodeIcon />
              Escanear
            </Button>
          </div>
        </>
      )}

      <ScannerDialog
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          if (!openProductId && !form) setScanCount(null)
        }}
        onDetected={onCodeDetected}
      />
      <ProductDialog
        productId={openProductId}
        onClose={() => {
          setOpenProductId(null)
          setScanCount(null)
        }}
        onEdit={(product) => {
          setOpenProductId(null)
          setForm({ mode: 'edit', product })
        }}
        scan={
          scanCount === null
            ? null
            : { count: scanCount, onScanNext: startScan, onFinish: finishScan }
        }
      />
      <ProductFormDialog
        state={form}
        onClose={() => {
          const editing = form?.mode === 'edit' ? form.product.id : null
          setForm(null)
          if (editing) setOpenProductId(editing)
          else setScanCount(null)
        }}
        onSaved={(product) => {
          setForm(null)
          setOpenProductId(product.id)
        }}
        onDeleted={() => {
          setForm(null)
          setOpenProductId(null)
        }}
        onAssignInstead={(code) => {
          setForm(null)
          setAssignCode(code)
        }}
      />
      <AssignBarcodeDialog
        barcode={assignCode}
        onClose={() => {
          setAssignCode(null)
          setScanCount(null)
        }}
        onAssigned={(product) => {
          setAssignCode(null)
          setOpenProductId(product.id)
        }}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false)
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
        }}
        theme={{ preference: theme.preference, onChange: theme.setPreference }}
        isStoragePersistent={isStoragePersistent}
      />
    </AppShell>
  )
}

function useScrollToTopOnRouteChange(route: string) {
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
  }, [route])
}
