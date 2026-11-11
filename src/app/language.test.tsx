import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createInMemoryRepositories } from '@/db/createRepositories'
import { setLanguagePreference, useDocumentLanguage } from '@/i18n'
import { LANGUAGE_STORAGE_KEY } from '@/i18n/store'
import { makeProduct } from '@/test/factories'
import { TestProviders } from '@/test/TestProviders'

import { MainScreen } from './MainScreen'

function DocumentLanguage() {
  useDocumentLanguage()
  return null
}

function renderApp() {
  const repositories = {
    ...createInMemoryRepositories({
      products: [makeProduct({ name: 'Lejía', quantity: 1.5, minimum: 4, unit: 'botellas' })],
    }),
    isPersistent: true,
  }
  render(
    <TestProviders repositories={repositories}>
      <MainScreen isPersistent />
    </TestProviders>,
  )
  return userEvent.setup()
}

describe('language', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('switches the whole interface from the settings and remembers the choice', async () => {
    const user = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Ajustes' }))
    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })

    await user.selectOptions(within(dialog).getByLabelText('Idioma de la aplicación'), 'fr')

    expect(await screen.findByRole('dialog', { name: 'Réglages' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventaire' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réassort (1)' })).toBeInTheDocument()
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('"fr"')
  })

  it('shows units, stock status and numbers in the chosen language', async () => {
    setLanguagePreference('en', { persist: false })
    renderApp()

    const row = await screen.findByRole('button', { name: /Lejía/ })
    expect(row).toHaveTextContent('1.5')
    expect(row).toHaveTextContent('bottles')
    expect(row).toHaveTextContent('Running low')
  })

  it('translates validation messages', async () => {
    setLanguagePreference('de', { persist: false })
    const user = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Neu' }))
    const dialog = screen.getByRole('dialog', { name: 'Neues Produkt' })
    await user.click(within(dialog).getByRole('button', { name: 'Produkt hinzufügen' }))

    expect(within(dialog).getByLabelText('Name')).toHaveAccessibleDescription(
      'Gib einen Namen ein.',
    )
  })

  it('switches to Arabic and back', async () => {
    const user = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Ajustes' }))
    const dialog = screen.getByRole('dialog', { name: 'Ajustes' })

    await user.selectOptions(within(dialog).getByLabelText('Idioma de la aplicación'), 'ar')
    expect(await screen.findByRole('dialog', { name: 'الإعدادات' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'المخزون' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('لغة التطبيق'), 'en')
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('follows the language of the phone while set to automatic', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['it-IT', 'en'])
    setLanguagePreference('auto', { persist: false })
    render(<DocumentLanguage />)
    expect(document.documentElement.lang).toBe('it')
    expect(document.documentElement.dir).toBe('ltr')
    vi.restoreAllMocks()
  })

  it('writes Arabic right to left', () => {
    setLanguagePreference('ar', { persist: false })
    render(<DocumentLanguage />)
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })
})
