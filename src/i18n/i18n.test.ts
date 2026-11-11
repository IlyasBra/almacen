import { describe, expect, it } from 'vitest'

import { detectDeviceLanguage, isRtl, LANGUAGES, matchLanguage } from './languages'
import { es } from './messages/es'
import { MESSAGES, translate, translatePlural } from './translate'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1])

describe('messages', () => {
  const keys = Object.keys(es) as (keyof typeof es)[]

  it.each(LANGUAGES)('%s has every key and no empty text', (language) => {
    for (const key of keys) {
      expect(MESSAGES[language][key], `${language}: ${key}`).toBeTruthy()
    }
  })

  it.each(LANGUAGES.filter((language) => language !== 'es'))(
    '%s uses the same placeholders as Spanish',
    (language) => {
      for (const key of keys) {
        const expected = placeholders(es[key]).sort()
        const actual = placeholders(MESSAGES[language][key]).sort()
        // Plural forms that name the number in words ("one task") need no {count}.
        if (key.endsWith('_one') || key.endsWith('_zero') || key.endsWith('_two')) continue
        expect(actual, `${language}: ${key}`).toEqual(expected)
      }
    },
  )

  it('has no keys beyond the Spanish ones, except extra plural forms', () => {
    for (const language of LANGUAGES) {
      const extra = Object.keys(MESSAGES[language]).filter((key) => !(key in es))
      for (const key of extra) expect(key).toMatch(/_(zero|two|few|many)$/)
    }
  })
})

describe('translate', () => {
  it('fills in placeholders', () => {
    expect(translate('es', 'error.nameTooLong', { max: 80 })).toBe(
      'El nombre no puede superar 80 caracteres.',
    )
    expect(translate('de', 'error.nameTooLong', { max: 80 })).toContain('80')
  })

  it('picks the plural form of each language', () => {
    expect(translatePlural('es', 'count.products', 1)).toBe('1 producto')
    expect(translatePlural('es', 'count.products', 3)).toBe('3 productos')
    expect(translatePlural('en', 'count.products', 1)).toBe('1 product')
    expect(translatePlural('fr', 'count.products', 0)).toBe('0 produit')
    expect(translatePlural('de', 'count.products', 2)).toBe('2 Produkte')
  })

  it('uses the extra plural forms of Arabic', () => {
    expect(translatePlural('ar', 'count.products', 2)).toBe('منتجان')
    expect(translatePlural('ar', 'count.products', 5)).toBe('5 منتجات')
    expect(translatePlural('ar', 'count.products', 11)).toBe('11 منتجًا')
    expect(translatePlural('ar', 'count.products', 100)).toBe('100 منتج')
  })
})

describe('device language', () => {
  it('maps regional tags to a supported language', () => {
    expect(matchLanguage('fr-CA')).toBe('fr')
    expect(matchLanguage('AR-SA')).toBe('ar')
    expect(matchLanguage('pt-BR')).toBeNull()
  })

  it('takes the first preferred language that is supported', () => {
    expect(detectDeviceLanguage(['pt-BR', 'it-IT', 'en'])).toBe('it')
  })

  it('falls back to English when none is supported', () => {
    expect(detectDeviceLanguage(['ja-JP', 'ko'])).toBe('en')
    expect(detectDeviceLanguage([])).toBe('en')
  })

  it('writes Arabic right to left only', () => {
    expect(isRtl('ar')).toBe(true)
    expect(LANGUAGES.filter(isRtl)).toEqual(['ar'])
  })
})
