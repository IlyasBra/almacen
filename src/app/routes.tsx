import { type NavItem } from '@/components/layout/MainNav'
import { ArrowsUpDownIcon, BoxIcon, ListIcon } from '@/components/ui/icons'

/** Hash routes. The values appear in the URL, so they are in Spanish. */
export const ROUTES = ['inventario', 'reponer', 'movimientos'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'inventario'

export const NAV_ITEMS: NavItem[] = [
  { id: 'inventario', label: 'Inventario', href: '#inventario', icon: <BoxIcon /> },
  { id: 'reponer', label: 'Reponer', href: '#reponer', icon: <ListIcon /> },
  { id: 'movimientos', label: 'Movimientos', href: '#movimientos', icon: <ArrowsUpDownIcon /> },
]
