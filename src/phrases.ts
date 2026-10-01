import { locale, type Locale } from './i18n'

export type PhraseEvent =
  | 'greeting'
  | 'feed'
  | 'feedAtCap'
  | 'feedCooldown'
  | 'taskStart'
  | 'taskComplete'
  | 'taskExtend'
  | 'taskAbandon'
  | 'overdue'
  | 'awayStart'
  | 'returned'

export const PHRASES: Record<PhraseEvent, Record<Locale, string[]>> = {
  greeting: {
    ru: ['Привет! Как дела?', 'Я скучал!', 'Чем займёмся?'],
    en: ['Hi! How are you?', 'I missed you!', 'What shall we do?'],
  },
  feed: {
    ru: ['Ням-ням! Спасибо!', 'Вкусно!', 'Ещё бы чуть-чуть!'],
    en: ['Yum-yum! Thank you!', 'Delicious!', 'A little more would be nice!'],
  },
  feedAtCap: {
    ru: ['Спасибо, я сыт!', 'Мне больше не влезет', 'Я и так доволен!'],
    en: ["Thanks, I'm full!", "I can't eat another bite", "I'm happy as is!"],
  },
  feedCooldown: {
    ru: ['Я ещё не проголодался', 'Давай попозже', 'Я сегодня уже ел'],
    en: ["I'm not hungry yet", 'Maybe later', 'I already ate today'],
  },
  taskStart: {
    ru: ['Ого, задача! Я помогу!', 'Берусь!', 'Звучит серьёзно!'],
    en: ['Whoa, a task! I will help!', "I'm on it!", 'Sounds serious!'],
  },
  taskComplete: {
    ru: ['Ура, всё готово!', 'Мы справились!', 'Отличная работа!'],
    en: ['Hooray, all done!', 'We did it!', 'Great job!'],
  },
  taskExtend: {
    ru: ['Ещё часик? Ладно...', 'Хорошо, но я буду быстрее уставать', 'Время летит...'],
    en: ['One more hour? Fine...', "Okay, but I'll get tired faster", 'Time flies...'],
  },
  taskAbandon: {
    ru: ['Эх... ладно', 'Ну вот...', 'Обидно'],
    en: ['Oh well... fine', 'Aw man...', "That's a shame"],
  },
  overdue: {
    ru: ['Время вышло... я расстроен', 'Ты обещал успеть...', 'Задача просрочена...'],
    en: ["Time's up... I'm sad", 'You promised to make it...', 'The task is overdue...'],
  },
  awayStart: {
    ru: ['Я ухожу...', 'Мне грустно...', 'Оставь меня ненадолго'],
    en: ["I'm leaving...", 'I feel sad...', 'Leave me alone for a while'],
  },
  returned: {
    ru: ['Я вернулся!', 'Скучал по тебе', 'Ну что, продолжим?'],
    en: ["I'm back!", 'I missed you', 'So, shall we continue?'],
  },
}

const lastPicks = new Map<PhraseEvent, string>()

export function pickPhrase(event: PhraseEvent): string {
  const options = PHRASES[event][locale]
  const previous = lastPicks.get(event)
  const candidates = options.length > 1 ? options.filter((phrase) => phrase !== previous) : options
  const phrase = candidates[Math.floor(Math.random() * candidates.length)]
  lastPicks.set(event, phrase)
  return phrase
}
