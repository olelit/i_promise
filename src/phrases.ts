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

export const PHRASES: Record<PhraseEvent, string[]> = {
  greeting: ['Привет! Как дела?', 'Я скучал!', 'Чем займёмся?'],
  feed: ['Ням-ням! Спасибо!', 'Вкусно!', 'Ещё бы чуть-чуть!'],
  feedAtCap: ['Спасибо, я сыт!', 'Мне больше не влезет', 'Я и так доволен!'],
  feedCooldown: ['Я ещё не проголодался', 'Давай попозже', 'Я сегодня уже ел'],
  taskStart: ['Ого, задача! Я помогу!', 'Берусь!', 'Звучит серьёзно!'],
  taskComplete: ['Ура, всё готово!', 'Мы справились!', 'Отличная работа!'],
  taskExtend: ['Ещё часик? Ладно...', 'Хорошо, но я буду быстрее уставать', 'Время летит...'],
  taskAbandon: ['Эх... ладно', 'Ну вот...', 'Обидно'],
  overdue: ['Время вышло... я расстроен', 'Ты обещал успеть...', 'Задача просрочена...'],
  awayStart: ['Я ухожу...', 'Мне грустно...', 'Оставь меня ненадолго'],
  returned: ['Я вернулся!', 'Скучал по тебе', 'Ну что, продолжим?'],
}

const lastPicks = new Map<PhraseEvent, string>()

export function pickPhrase(event: PhraseEvent): string {
  const options = PHRASES[event]
  const previous = lastPicks.get(event)
  const candidates = options.length > 1 ? options.filter((phrase) => phrase !== previous) : options
  const phrase = candidates[Math.floor(Math.random() * candidates.length)]
  lastPicks.set(event, phrase)
  return phrase
}
