export type RulesLanguage = 'ru' | 'en'

export const RULES: Record<RulesLanguage, string> = {
  ru: [
    'Правила игры:',
    '',
    '• Настроение падает само: −20 в час.',
    '• «Покормить» — раз в 24 часа: +20, но не выше 20.',
    '• Задача сразу поднимает настроение (20 + 10 за каждый час), но пока она идёт, настроение падает быстрее.',
    '• «Выполнено» — настроение остаётся; «Отказаться» или просрочка — падает до 0.',
    '• На нуле персонаж отворачивается, при −100 уходит и вернётся через 2 часа.',
    '• Кнопки времени ⏸/1×/60×/600× ускоряют всё игровое время, чтобы посмотреть, как меняется настроение. При запуске скорость снова 1×.',
    '• Скины меняют палитру персонажа.',
  ].join('\n'),
  en: [
    'Game rules:',
    '',
    '• Mood drops by itself: −20 per hour.',
    '• "Feed" once every 24 hours: +20, but not above 20.',
    '• A task raises mood at once (20 + 10 per hour), but while it runs mood drops faster.',
    '• "Done" keeps the mood; "Abandon" or an overdue task drops it to 0.',
    '• At zero the pet turns away; at −100 it leaves and comes back in 2 hours.',
    '• The time buttons ⏸/1×/60×/600× speed up all game time so you can watch the mood change. The speed resets to 1× on each launch.',
    '• Skins change the pet palette.',
  ].join('\n'),
}

export function rulesLanguage(languageCode: string): RulesLanguage {
  return languageCode.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
}

export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

export async function sendRules(
  botToken: string,
  chatId: number,
  languageCode: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: RULES[rulesLanguage(languageCode)],
      }),
    })
    if (!response.ok) {
      console.error('sendMessage failed', response.status, await response.text())
      return false
    }
    const result = (await response.json()) as { ok?: unknown; description?: unknown }
    if (result.ok !== true) {
      console.error(
        'sendMessage returned ok != true',
        typeof result.description === 'string' ? result.description : '',
      )
      return false
    }
    return true
  } catch {
    console.error('sendMessage request failed')
    return false
  }
}
