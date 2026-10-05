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
  | 'taskHalf'
  | 'taskQuarter'
  | 'taskTenMinutes'
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
    ru: ['Понял, слежу за временем', 'Записал. Удачи!', 'Буду ждать'],
    en: ['Got it, watching the clock', 'Noted. Good luck!', "I'll be waiting"],
  },
  taskComplete: {
    ru: ['Ты успел! Отлично', 'Готово. Молодец!', 'Справился!'],
    en: ['You made it! Nice', 'Done. Well played!', 'You did it!'],
  },
  taskExtend: {
    ru: ['Продлил? Посмотрим', 'Время добавлено', 'Ещё час в запасе'],
    en: ['Extended? We will see', 'Time added', 'One more hour'],
  },
  taskAbandon: {
    ru: ['Жаль, но бывает', 'Ладно, отменили', 'В другой раз'],
    en: ['Too bad, it happens', 'Okay, cancelled', 'Next time'],
  },
  overdue: {
    ru: ['Время вышло...', 'Не успел...', 'Срок истёк'],
    en: ['Time is up...', "You didn't make it...", 'The deadline passed'],
  },
  taskHalf: {
    ru: ['Половина времени прошла', 'Уже половина срока', 'Время идёт: половина'],
    en: ['Half the time is gone', 'Halfway through', 'Half the time left'],
  },
  taskQuarter: {
    ru: ['Осталась четверть времени', 'Четверть срока — поторопись', 'Большая часть прошла'],
    en: ['A quarter of the time left', 'Quarter left — hurry up', 'Most of the time is gone'],
  },
  taskTenMinutes: {
    ru: ['Осталось 10 минут!', 'Десять минут — соберись', 'Совсем мало времени'],
    en: ['10 minutes left!', 'Ten minutes — focus', 'Very little time left'],
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
