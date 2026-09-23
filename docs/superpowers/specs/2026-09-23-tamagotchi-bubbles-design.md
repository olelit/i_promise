# Tamagotchi: Speech Bubbles — Design

Date: 2026-09-23
Status: Approved (user waived review gates)

Stage 3 of 3 (stage 1: mood/indicator/feeding/body, stage 2: tasks).

## Goal

A cloud above the tamagotchi that says something in reaction to the user's
actions and to state changes.

## Events and phrases

Phrases are Russian, picked randomly per event, never repeating the immediately
previous phrase of the same event.

| Event           | Trigger                                                | Phrases |
| --------------- | ------------------------------------------------------ | ------- |
| `greeting`      | app opened (once per load)                             | «Привет! Как дела?», «Я скучал!», «Чем займёмся?» |
| `feed`          | successful feeding below the cap                       | «Ням-ням! Спасибо!», «Вкусно!», «Ещё бы чуть-чуть!» |
| `feedAtCap`     | clicking the disabled feed button while mood is already at/above `FEED_CAP` | «Спасибо, я сыт!», «Мне больше не влезет», «Я и так доволен!» |
| `feedCooldown`  | clicking the disabled feed button while on cooldown | «Я ещё не проголодался», «Давай попозже», «Я сегодня уже ел» |
| `taskStart`     | task started                                           | «Ого, задача! Я помогу!», «Берусь!», «Звучит серьёзно!» |
| `taskComplete`  | task marked done                                       | «Ура, всё готово!», «Мы справились!», «Отличная работа!» |
| `taskExtend`    | «+1 час» pressed                                       | «Ещё часик? Ладно...», «Хорошо, но я буду быстрее уставать», «Время летит...» |
| `taskAbandon`   | task abandoned                                         | «Эх... ладно», «Ну вот...», «Обидно» |
| `overdue`       | task missed its deadline                               | «Время вышло... я расстроен», «Ты обещал успеть...», «Задача просрочена...» |
| `awayStart`     | mood reached `-100` and the pet leaves                 | «Я ухожу...», «Мне грустно...», «Оставь меня ненадолго» |
| `returned`      | the pet returns after being away                       | «Я вернулся!», «Скучал по тебе», «Ну что, продолжим?» |

`feedCooldown` is triggered even though the button is disabled: the button is
wrapped in a small clickable container, and `pointer-events: none` on the
disabled button lets the click reach the wrapper, which shows the phrase
without feeding.

## Behavior

- The bubble appears above the tamagotchi (absolutely positioned above the
  scene, centered), with a small pop-in animation.
- Visible for 4 seconds, then fades out; a new phrase replaces the current one
  and restarts the timer.
- Picking: `pickPhrase(event: PhraseEvent): string` keeps a module-level map of
  the last pick per event, filters it out of the candidates, and picks a random
  remaining phrase, so the same phrase never repeats immediately.
- `greeting` fires once per app load, after the state is loaded.
- `awayStart` is detected when `applyDecay` transitions into the away state;
  `returned` when it leaves the away state.
- `overdue` is detected when the task disappears through `applyDecay` (the
  deadline passed), as opposed to complete/abandon which are explicit actions.
- While the pet is away the bubble can still show `awayStart`/`returned` (it
  sits above the scene, which stays in place).

## Files

- Create: `src/phrases.ts` (typed event map and `pickPhrase(event: PhraseEvent): string`),
  `src/components/SpeechBubble.vue`
- Modify: `src/App.vue` (trigger wiring, bubble timer), `README.MD`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless browser: feed → a feed phrase appears and disappears after ~4s;
  start a task → a `taskStart` phrase; overdue injected state → an `overdue`
  phrase; reload → a `greeting` phrase.
- Phrases never repeat the previous one for the same event.
