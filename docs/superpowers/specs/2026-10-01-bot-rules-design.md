# Tamagotchi: Bot-Delivered Rules — Design

Date: 2026-10-01
Status: Approved

Stage 15.

## Goal

Replace the in-app rules dialog and its button with a one-time rules message
sent by the bot into the user's chat on first launch. The message is sent by a
Vercel serverless function that verifies the Mini App `initData`, so the bot
token never reaches the client.

## 1. Backend

- New `api/rules.ts` (Vercel Edge Function, no dependencies):
  - `POST /api/rules` with `{ initData }`.
  - Verifies the signature exactly as the Telegram docs prescribe:
    `secret = HMAC_SHA256("WebAppData", BOT_TOKEN)`,
    `hash = HMAC_SHA256(secret, data_check_string)` with the parameters sorted
    by key and joined by `\n`; rejects a mismatch with 401.
  - Rejects stale `auth_date` (older than 24 hours) and missing/invalid user
    data.
  - Picks the rules text by `user.language_code` (`ru*` → Russian, else
    English) and calls Bot API `sendMessage` to `user.id`.
  - Returns 200 only after Telegram accepted the message; 502 on Telegram
    errors; 500 when `BOT_TOKEN` is not configured.
- `BOT_TOKEN` is a Vercel environment variable (Production and Preview). It is
  never committed and never sent to the client.
- `initData` is never logged.
- «Один раз на пользователя» обеспечивает клиентский флаг `rulesSent`;
  серверной идемпотентности нет (базы данных нет), поэтому в пределах
  24-часового окна повторная отправка того же `initData` может прислать
  сообщение ещё раз.

## 2. Client

- Delete `src/components/RulesDialog.vue`, the «Правила» button, the auto-show
  dialog watcher, and the rules strings (`rules`, `gotIt`, `rulesBullets`)
  from the client catalog.
- The bottom action row returns to `v-if="!inTelegram || !hasSecondaryButton"`.
- State: `rulesSeen` is replaced by `rulesSent: boolean` (default `false`) so
  every existing player receives the bot message once; an old `rulesSeen`
  field is ignored.
- After the state loads and only in Telegram with `rulesSent === false`, the
  app calls `POST /api/rules` with `webApp.initData`. On a 200 response it
  sets `rulesSent = true` and saves; on any failure the flag stays `false` and
  the call is retried on the next launch.
- Browser mode performs no request.

## 3. Security

- The token lives only in the Vercel environment.
- The endpoint trusts nothing from the client except `initData`, and only
  after HMAC verification and freshness checks.
- A tampered or missing signature, a stale `auth_date`, or a wrong token all
  fail closed (401).

## Files

- New: `api/rules.ts`
- Modify: `tsconfig.json`, `src/App.vue`, `src/tamagotchi.ts`,
  `src/storage.ts`, `src/i18n.ts`, `README.MD`, `AGENTS.md`,
  `docs/superpowers/specs/2026-10-01-rules-design.md` (superseded note)
- Delete: `src/components/RulesDialog.vue`

## Verification

- `npm run typecheck` and `npm run build` pass (the API file is included in
  the typecheck).
- A local script signs a synthetic `initData` with a test token and checks
  `verifyInitData`: valid passes, a tampered parameter fails, an old
  `auth_date` fails, a wrong token fails.
- After deploy with `BOT_TOKEN` set: the first launch in Telegram sends the
  rules message into the chat; a second launch does not send it again.
