import { getWebApp } from './telegram'
import type { SkinId } from './tamagotchi'

export type Locale = 'ru' | 'en'

function detectLocale(): Locale {
  const code =
    getWebApp()?.initDataUnsafe?.user?.language_code ??
    (typeof navigator === 'undefined' ? '' : navigator.language)
  return code.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
}

export const locale: Locale = detectLocale()

export function m<T>(entry: { ru: T; en: T }): T {
  return locale === 'ru' ? entry.ru : entry.en
}

export const messages = {
  appTitle: { ru: 'Тамагочи', en: 'Tamagotchi' },
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
    en: (time: string) => `It ran away. Back in ${time}`,
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
  abandonConfirm: { ru: 'Точно отказаться?', en: 'Really abandon?' },
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
  tasks: { ru: 'Задачи', en: 'Tasks' },
  newTask: { ru: 'Новая задача', en: 'New task' },
  noActiveTask: { ru: 'Нет активной задачи', en: 'No active task' },
  historyTitle: { ru: 'История', en: 'History' },
  historyEmpty: { ru: 'Пока нет завершённых задач', en: 'No finished tasks yet' },
  statusDone: { ru: 'Выполнена', en: 'Done' },
  statusAbandoned: { ru: 'Отказана', en: 'Abandoned' },
  statusOverdue: { ru: 'Просрочена', en: 'Overdue' },
  progressOf: {
    ru: (done: string, total: string) => `${done} из ${total}`,
    en: (done: string, total: string) => `${done} of ${total}`,
  },
  overdueFor: {
    ru: (time: string) => `Просрочено на ${time}`,
    en: (time: string) => `Overdue by ${time}`,
  },
  planLabel: {
    ru: (hours: string) => `план ${hours}`,
    en: (hours: string) => `plan ${hours}`,
  },
  factLabel: {
    ru: (time: string) => `факт ${time}`,
    en: (time: string) => `took ${time}`,
  },
  hoursShort: {
    ru: (hours: number) => `${hours} ч`,
    en: (hours: number) => `${hours} h`,
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

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  if (totalMinutes < 1) {
    return m(messages.lessThanMinute)
  }
  const hours = Math.floor(totalMinutes / 60)
  const rest = totalMinutes % 60
  if (hours === 0) {
    return m(messages.minutes)(rest)
  }
  if (rest === 0) {
    return m(messages.hoursShort)(hours)
  }
  return m(messages.hoursMinutes)(hours, rest)
}

export function formatDateTime(ts: number): string {
  const date = new Date(ts)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (locale === 'ru') {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${time}`
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}
