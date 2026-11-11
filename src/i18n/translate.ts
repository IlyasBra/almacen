import { type Language } from './languages'
import { ar } from './messages/ar'
import { de } from './messages/de'
import { en } from './messages/en'
import { es, type MessageKey, type Messages } from './messages/es'
import { fr } from './messages/fr'
import { it } from './messages/it'

export const MESSAGES: Record<Language, Messages> = { es, en, fr, ar, it, de }

export type Params = Record<string, string | number>

/** Keys that have one message per plural form: "count.tasks_one", "count.tasks_other"… */
export type PluralKey =
  Extract<MessageKey, `${string}_other`> extends `${infer Base}_other` ? Base : never

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

export function translate(language: Language, key: MessageKey, params?: Params): string {
  return interpolate(MESSAGES[language][key], params)
}

const pluralRules = new Map<Language, Intl.PluralRules>()

/** The message for `count` in the plural form of the language; `{count}` is filled in. */
export function translatePlural(
  language: Language,
  key: PluralKey,
  count: number,
  params?: Params,
): string {
  let rules = pluralRules.get(language)
  if (!rules) {
    rules = new Intl.PluralRules(language)
    pluralRules.set(language, rules)
  }
  const messages = MESSAGES[language] as Record<string, string>
  const template = messages[`${key}_${rules.select(count)}`] ?? messages[`${key}_other`] ?? key
  return interpolate(template, { count, ...params })
}
