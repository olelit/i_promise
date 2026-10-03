# Tamagotchi Stage 16: Bot Commands for the Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/rule`, `/rules` and `/start` bot commands that reply with the rules via a webhook, sharing the rules text with the first-launch endpoint and logging delivery errors.

**Architecture:** `api/_rules.ts` holds the shared text and the `sendRules` helper; `api/rules.ts` uses it; `api/webhook.ts` authenticates Telegram updates with `WEBHOOK_SECRET` and answers the commands.

**Tech Stack:** Vercel Edge Functions (Web `Request`/`Response`, Web Crypto), Vue 3 + Vite + TypeScript.

## Global Constraints

- Commit messages MUST be written in English only.
- The bot token and webhook secret live only in the Vercel environment (`BOT_TOKEN`, `WEBHOOK_SECRET`); never in the repo or the client, and `initData` is never logged.
- No new dependencies.
- No test suite: verification is `npm run typecheck` + `npm run build` plus the listed local checks.

---

### Task 1: Shared rules helper, webhook commands and docs

**Files:**
- Create: `api/_rules.ts`, `api/webhook.ts`
- Modify: `api/rules.ts`, `tsconfig.json`, `README.MD`, `AGENTS.md`

**Interfaces:**
- Produces:
  - `api/_rules.ts`: `RulesLanguage`, `RULES`, `rulesLanguage(languageCode): RulesLanguage`, `sendRules(botToken, chatId, languageCode): Promise<boolean>`.
  - `api/webhook.ts`: default `handler(request: Request): Promise<Response>`; 405 on non-POST, 500 when `BOT_TOKEN`/`WEBHOOK_SECRET` is unset, 401 on a wrong secret header, 200 for updates.

- [ ] **Step 1: Create `api/_rules.ts`**

```ts
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

export function rulesLanguage(languageCode: string): RulesLanguage {
  return languageCode.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
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
    const result = (await response.json()) as { ok?: unknown }
    if (result.ok !== true) {
      console.error('sendMessage returned ok != true')
      return false
    }
    return true
  } catch {
    console.error('sendMessage request failed')
    return false
  }
}
```

- [ ] **Step 2: Allow `.ts` import extensions and refactor `api/rules.ts`**

Add `"allowImportingTsExtensions": true` to `compilerOptions` in
`tsconfig.json` (safe with `noEmit`), so the API files can import
`./_rules.ts` with an explicit extension and stay runnable under Node's
native TypeScript stripping for local tests.

Add at the top of `api/rules.ts`:

```ts
import { sendRules } from './_rules.ts'
```

Delete the local `type RulesLanguage = 'ru' | 'en'` and the whole `const RULES: Record<RulesLanguage, string> = { ... }` block.

Replace the send block:

```ts
  const language: RulesLanguage =
    user.languageCode.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en'
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.userId,
      text: RULES[language],
    }),
  })
  if (!response.ok) {
    return new Response('Telegram error', { status: 502 })
  }
  const result = (await response.json()) as { ok?: unknown }
  if (result.ok !== true) {
    return new Response('Telegram error', { status: 502 })
  }
```

with:

```ts
  const sent = await sendRules(botToken, user.userId, user.languageCode)
  if (!sent) {
    return new Response('Telegram error', { status: 502 })
  }
```

- [ ] **Step 3: Create `api/webhook.ts`**

```ts
import { sendRules } from './_rules.ts'

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
  if (request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
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
```

- [ ] **Step 4: Verify the handler locally**

Write `/tmp/webhook-test.mjs`:

```js
import handler from '/home/oleg/code/i_promise/api/webhook.ts'

const call = (method, headers = {}, body) =>
  handler(
    new Request('https://example.com/api/webhook', {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )

process.env.BOT_TOKEN = ''
process.env.WEBHOOK_SECRET = ''
console.log('GET:', (await call('GET')).status)
console.log('no env:', (await call('POST')).status)

process.env.BOT_TOKEN = '123:FAKE'
process.env.WEBHOOK_SECRET = 'secret'
console.log('wrong secret:', (await call('POST', { 'x-telegram-bot-api-secret-token': 'nope' }, {})).status)
const unknown = await call('POST', { 'x-telegram-bot-api-secret-token': 'secret' }, { message: { text: 'hi', chat: { id: 1 } } })
console.log('unknown command:', unknown.status)
const rule = await call('POST', { 'x-telegram-bot-api-secret-token': 'secret' }, { message: { text: '/rule', chat: { id: 1 }, from: { language_code: 'ru' } } })
console.log('rule:', rule.status, JSON.stringify(await rule.json()))
```

Run: `node /tmp/webhook-test.mjs`
Expected:

```
GET: 405
no env: 500
wrong secret: 401
unknown command: 200
rule: 200 {"ok":false}
```

(`ok: false` is correct with a fake token: the command path runs and Telegram
rejects the send.)

- [ ] **Step 5: Update `README.MD`**

Append to the rules paragraph:

```markdown
Правила также можно получить командой `/rule` (или `/rules`, `/start`) в чате
с ботом.
```

Replace deployment step 2:

```markdown
2. В настройках проекта на Vercel добавь переменную окружения `BOT_TOKEN`
   (токен из @BotFather) для Production и Preview и переразверни проект —
   она нужна функции `api/rules.ts`.
```

with:

```markdown
2. В настройках проекта на Vercel добавь переменные окружения `BOT_TOKEN`
   (токен из @BotFather) и `WEBHOOK_SECRET` (любая случайная строка) для
   Production и Preview и переразверни проект — они нужны функциям
   `api/rules.ts` и `api/webhook.ts`.
```

Add after deployment step 4:

```markdown
5. Настрой вебхук команд (один раз): открой в браузере
   `https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://<адрес>/api/webhook&secret_token=<СЕКРЕТ>`
   (подставь токен бота и значение `WEBHOOK_SECRET`). После этого бот отвечает
   правилами на `/rule`, `/rules` и `/start`.
```

Add to the structure list after the `api/rules.ts` line:

```markdown
- `api/webhook.ts` — команды бота: `/rule`, `/rules`, `/start` присылают правила
```

- [ ] **Step 6: Update `AGENTS.md`**

Replace:

```markdown
Tamagotchi Telegram Mini App: Vue 3 + Vite + TypeScript; the only backend is
the Vercel function that sends the rules. A single
```

with:

```markdown
Tamagotchi Telegram Mini App: Vue 3 + Vite + TypeScript; the only backend is
the Vercel functions that send the rules and answer the `/rule` command. A
single
```

Replace:

```markdown
- No backend except the Vercel Edge Function `api/rules.ts`, which verifies
  `initData` and sends the one-time rules message through the Bot API; no
  other network calls. The bot token lives only in the `BOT_TOKEN`
  environment variable on Vercel. Outside Telegram the app runs in browser
  mode (localStorage + dev controls).
```

with:

```markdown
- No backend except the Vercel Edge Functions `api/rules.ts` (verifies
  `initData` and sends the one-time rules message) and `api/webhook.ts`
  (answers `/rule`, `/rules` and `/start`); no other network calls. The bot
  token and the webhook secret live only in the `BOT_TOKEN` and
  `WEBHOOK_SECRET` environment variables on Vercel. Outside Telegram the app
  runs in browser mode (localStorage + dev controls).
```

- [ ] **Step 7: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

```bash
git add api/_rules.ts api/webhook.ts api/rules.ts tsconfig.json README.MD AGENTS.md
git commit -m "Add bot commands that send the rules"
```

---

## Self-review notes

- Spec coverage: shared module and refactor (Steps 1–2), webhook (Step 3),
  local verification (Step 4), docs (Steps 5–6).
- `_rules.ts` is not routed by Vercel because of the leading underscore.
- `sendRules` never throws (fetch errors are caught), so both handlers stay
  deterministic and Telegram never gets a 5xx from a network hiccup.
