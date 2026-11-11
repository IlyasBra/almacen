import { type NavItem } from '@/components/layout/MainNav'
import { ArrowsUpDownIcon, BoxIcon, ListIcon } from '@/components/ui/icons'
import { type Params, type MessageKey } from '@/i18n'

/** Hash routes. The values appear in the URL, so they stay the same in every language. */
export const ROUTES = ['inventario', 'reponer', 'movimientos'] as const
export type Route = (typeof ROUTES)[number]

export const DEFAULT_ROUTE: Route = 'inventario'

/** Sections of the bottom bar. `restockCount` is shown next to "Restock" when there is any. */
export function navItems(
  t: (key: MessageKey, params?: Params) => string,
  restockCount: number,
): NavItem[] {
  return [
    { id: 'inventario', label: t('nav.inventory'), href: '#inventario', icon: <BoxIcon /> },
    {
      id: 'reponer',
      label: restockCount > 0 ? t('nav.restockCount', { count: restockCount }) : t('nav.restock'),
      href: '#reponer',
      icon: <ListIcon />,
    },
    {
      id: 'movimientos',
      label: t('nav.movements'),
      href: '#movimientos',
      icon: <ArrowsUpDownIcon />,
    },
  ]
}
