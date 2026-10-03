import { safeEqual, sendRules } from './_rules'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

interface TelegramUpdate {
  message?: {
    text?: string
    chat?: { id?: number }
    from?: { language_code?: string }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const botToken = process.env.BOT_TOKEN
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (
    botToken === undefined ||
    botToken === '' ||
    webhookSecret === undefined ||
    webhookSecret === ''
  ) {
    return new Response('Server is not configured', { status: 500 })
  }
  if (!safeEqual(request.headers.get('x-telegram-bot-api-secret-token') ?? '', webhookSecret)) {
    return new Response('Unauthorized', { status: 401 })
  }
  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const message = update.message
  const chatId = message?.chat?.id
  const command = message?.text?.trim().toLowerCase().split(/[\s@]/)[0]
  if (
    chatId !== undefined &&
    (command === '/rule' || command === '/rules' || command === '/start')
  ) {
    const sent = await sendRules(botToken, chatId, message?.from?.language_code ?? 'en')
    return json({ ok: sent })
  }
  return json({ ok: true })
}
