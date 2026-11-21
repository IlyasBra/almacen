import { type NavItem } from '@/components/layout/MainNav'
import { ArrowsUpDownIcon, BoxIcon } from '@/components/ui/icons'
import { type Params, type MessageKey } from '@/i18n'

/** Hash routes. The values appear in the URL, so they stay the same in every language. */
export const ROUTES = ['inventario', 'movimientos'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'inventario'

/** Sections of the bottom bar. */
export function navItems(t: (key: MessageKey, params?: Params) => string): NavItem[] {
  return [
    { id: 'inventario', label: t('nav.inventory'), href: '#inventario', icon: <BoxIcon /> },
    {
      id: 'movimientos',
      label: t('nav.movements'),
      href: '#movimientos',
      icon: <ArrowsUpDownIcon />,
    },
  ]
}
