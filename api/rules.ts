export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

type RulesLanguage = 'ru' | 'en'

const RULES: Record<RulesLanguage, string> = {
  ru: [
    'Правила игры:',
    '',
    '• Настроение падает само: −20 в час.',
    '• «Покормить» — раз в 24 часа: +20, но не выше 20.',
    '• Задача сразу поднимает настроение (20 + 10 за каждый час), но пока она идёт, настроение падает быстрее.',
    '• «Выполнено» — настроение остаётся; «Отказаться» или просрочка — падает до 0.',
    '• На нуле персонаж отворачивается, при −100 уходит и вернётся через 2 часа.',
    '• Полоску настроения можно перетаскивать, чтобы посмотреть состояния.',
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
    '• Drag the mood bar to preview the states.',
    '• Skins change the pet palette.',
  ].join('\n'),
}

const AUTH_MAX_AGE_SECONDS = 86_400

async function hmacSha256(
  key: Uint8Array<ArrayBuffer>,
  message: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return new Uint8Array(signature)
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

export interface InitDataUser {
  userId: number
  languageCode: string
}

export async function verifyInitData(
  initData: string,
  botToken: string,
): Promise<InitDataUser | null> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (hash === null || hash === '') {
    return null
  }
  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken)
  const computed = toHex(await hmacSha256(secret, dataCheckString))
  if (!safeEqual(computed, hash)) {
    return null
  }
  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SECONDS) {
    return null
  }
  const rawUser = params.get('user')
  if (rawUser === null) {
    return null
  }
  try {
    const user = JSON.parse(rawUser) as { id?: unknown; language_code?: unknown }
    if (typeof user.id !== 'number') {
      return null
    }
    const languageCode = typeof user.language_code === 'string' ? user.language_code : 'en'
    return { userId: user.id, languageCode }
  } catch {
    return null
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const botToken = process.env.BOT_TOKEN
  if (botToken === undefined || botToken === '') {
    return new Response('Server is not configured', { status: 500 })
  }
  let initData = ''
  try {
    const body = (await request.json()) as { initData?: unknown }
    if (typeof body.initData === 'string') {
      initData = body.initData
    }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const user = await verifyInitData(initData, botToken)
  if (user === null) {
    return new Response('Unauthorized', { status: 401 })
  }
  const language: RulesLanguage =
    user.languageCode.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.userId,
      text: RULES[language],
      disable_web_page_preview: true,
    }),
  })
  if (!response.ok) {
    return new Response('Telegram error', { status: 502 })
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
