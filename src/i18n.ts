import { getWebApp } from './telegram'
import type { SkinId } from './tamagotchi'

export type Locale = 'ru' | 'en'

function detectLocale(): Locale {
  const code =
    getWebApp()?.initDataUnsafe?.user?.language_code ??
    (typeof navigator === 'undefined' ? '' : navigator.language)
  return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export const locale: Locale = detectLocale()

export function m<T>(entry: { ru: T; en: T }): T {
  return locale === 'ru' ? entry.ru : entry.en
}

export const messages = {
  banner: {
    ru: 'Приложение открыто не в Telegram: настроение хранится локально в браузере.',
    en: 'The app is open outside Telegram: mood is stored locally in the browser.',
  },
  taskButton: { ru: 'Начать задачу', en: 'New task' },
  taskButtonActive: { ru: 'Задача', en: 'Task' },
  skins: { ru: 'Скины', en: 'Skins' },
  feed: { ru: 'ПОКОРМИТЬ', en: 'FEED' },
  full: { ru: 'Сыт', en: 'Full' },
  feedCooldown: {
    ru: (time: string) => `Покормить через ${time}`,
    en: (time: string) => `Feed in ${time}`,
  },
  away: {
    ru: (time: string) => `Он ушёл. Вернётся через ${time}`,
    en: (time: string) => `It's away. Back in ${time}`,
  },
  mood: { ru: 'Настроение', en: 'Mood' },
  newTaskTitle: { ru: 'Начать задачу', en: 'New task' },
  hoursLabel: { ru: 'Сколько часов', en: 'Hours' },
  descriptionLabel: { ru: 'Краткое описание', en: 'Short description' },
  descriptionPlaceholder: { ru: 'Что нужно сделать?', en: 'What needs doing?' },
  cancel: { ru: 'Отмена', en: 'Cancel' },
  start: { ru: 'Начать', en: 'Start' },
  taskTitle: { ru: 'Задача', en: 'Task' },
  remaining: {
    ru: (time: string) => `Осталось: ${time}`,
    en: (time: string) => `Left: ${time}`,
  },
  overdue: { ru: 'Просрочено', en: 'Overdue' },
  taskHours: {
    ru: (hours: number) => `Часов: ${hours}`,
    en: (hours: number) => `Hours: ${hours}`,
  },
  taskExtensions: {
    ru: (count: number) => `Продлений: ${count}`,
    en: (count: number) => `Extensions: ${count}`,
  },
  done: { ru: 'Выполнено', en: 'Done' },
  extend: { ru: '+1 час', en: '+1 hour' },
  abandon: { ru: 'Отказаться', en: 'Abandon' },
  abandonConfirm: { ru: 'Точно отказаться?', en: 'Abandon for sure?' },
  close: { ru: 'Закрыть', en: 'Close' },
  lessThanMinute: { ru: 'меньше минуты', en: 'less than a minute' },
  minutes: {
    ru: (count: number) => `${count} мин`,
    en: (count: number) => `${count} min`,
  },
  hoursMinutes: {
    ru: (hours: number, minutes: number) => `${hours} ч ${minutes} мин`,
    en: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
  },
  rules: { ru: 'Правила', en: 'Rules' },
  gotIt: { ru: 'Понятно', en: 'Got it' },
  rulesBullets: {
    ru: [
      'Настроение падает само: −20 в час.',
      '«Покормить» — раз в 24 часа: +20, но не выше 20.',
      'Задача сразу поднимает настроение (20 + 10 за каждый час), но пока она идёт, настроение падает быстрее.',
      '«Выполнено» — настроение остаётся; «Отказаться» или просрочка — падает до 0.',
      'На нуле персонаж отворачивается, при −100 уходит и вернётся через 2 часа.',
      'Полоску настроения можно перетаскивать, чтобы посмотреть состояния.',
      'Скины меняют палитру персонажа.',
    ],
    en: [
      'Mood drops by itself: −20 per hour.',
      '"Feed" once every 24 hours: +20, but not above 20.',
      'A task raises mood at once (20 + 10 per hour), but while it runs mood drops faster.',
      '"Done" keeps the mood; "Abandon" or an overdue task drops it to 0.',
      'At zero the pet turns away; at −100 it leaves and comes back in 2 hours.',
      'Drag the mood bar to preview the states.',
      'Skins change the pet palette.',
    ],
  },
}

export const SKIN_NAMES: Record<SkinId, { ru: string; en: string }> = {
  classic: { ru: 'Классика', en: 'Classic' },
  sky: { ru: 'Небо', en: 'Sky' },
  rose: { ru: 'Роза', en: 'Rose' },
}

export function skinName(id: SkinId): string {
  return m(SKIN_NAMES[id])
}

export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) {
    return m(messages.lessThanMinute)
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return m(messages.minutes)(rest)
  }
  return m(messages.hoursMinutes)(hours, rest)
}
