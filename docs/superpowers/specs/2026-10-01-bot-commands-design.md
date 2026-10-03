# Tamagotchi: Bot Commands for the Rules — Design

Date: 2026-10-01
Status: Approved

Stage 16.

## Goal

Let the user get the rules at any time by messaging the bot: `/rule`, `/rules`
and `/start` reply with the rules text. Delivered through a Telegram webhook,
reusing the same rules text as the first-launch message. Add error logging so
delivery problems can be diagnosed from the Vercel logs.

## 1. Shared rules module

- New `api/_rules.ts` (the leading underscore keeps Vercel from routing it):
  - `RulesLanguage`, `RULES` (ru/en text, moved from `api/rules.ts`).
  - `rulesLanguage(languageCode): RulesLanguage` (`ru*` → ru, else en).
  - `sendRules(botToken, chatId, languageCode): Promise<boolean>` — calls
    `sendMessage`, verifies the Bot API `ok` field, and logs the Telegram error
    description on failure (never `initData` or the token).
- `api/rules.ts` imports `sendRules` and keeps its current behavior.

## 2. Webhook

- New `api/webhook.ts` (Vercel Edge Function):
  - `POST` only (405 otherwise).
  - Requires `BOT_TOKEN` and `WEBHOOK_SECRET` (500 if unset) and checks the
    `X-Telegram-Bot-Api-Secret-Token` header against `WEBHOOK_SECRET` (401 on
    mismatch).
  - `/rule`, `/rules`, `/start` (optionally `@botname`) reply with the rules to
    `message.chat.id` using `message.from.language_code`.
  - Other updates are ignored; every accepted update returns 200 so Telegram
    does not retry.
- Setup (documented in the README): add `BOT_TOKEN` and `WEBHOOK_SECRET` on
  Vercel, then once open
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/webhook&secret_token=<SECRET>`.

## Files

- New: `api/_rules.ts`, `api/webhook.ts`
- Modify: `api/rules.ts`, `README.MD`, `AGENTS.md`
- No new dependencies.

## Verification

- `npm run typecheck` and `npm run build` pass.
- A local Node script calls the webhook handler with synthetic `Request`s:
  405 on GET, 500 without env, 401 with a wrong secret header, 200 for an
  unknown command, and 200 `{ ok: false }` for `/rule` with a bogus token
  (Telegram rejects it) — proving the command path is wired.
- After deploy: `/rule` in the bot chat returns the rules; the first-launch
  message path is unchanged.
