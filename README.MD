# i_promise — Telegram Mini App Demo

Минимальное демо Telegram Mini App на Vue 3 + Vite + TypeScript.
Показывает данные пользователя, тему Telegram, MainButton, BackButton и
haptic feedback. Бэкенда нет — только статика.

## Требования

- Node.js 20.19+ или 22.12+

## Команды

- `npm install` — установить зависимости
- `npm run dev` — dev-сервер на http://localhost:5173
- `npm run typecheck` — проверка типов (`vue-tsc --noEmit`)
- `npm run build` — проверка типов и сборка в `dist/`
- `npm run preview` — локальный просмотр собранной версии

В обычном браузере приложение открывается с баннером и тестовыми данными —
это нормально, реальные данные приходят только из Telegram.

## Как подключить к боту

1. Собери и выложи приложение на любой HTTPS-хостинг
   (GitHub Pages, Vercel, Netlify, ...):

   ```bash
   npm run build
   # залей содержимое dist/ на хостинг
   ```

2. Укажи URL в BotFather:
   - `/newapp` — создать Mini App и указать URL; или
   - `/mybots` → выбрать бота → Bot Settings → Menu Button → указать URL
     (или команда `/setmenubutton`).

3. Открой бота в Telegram и нажми кнопку меню — приложение загрузится
   внутри Telegram с реальными данными пользователя.

### Хостинг в подкаталоге

Если приложение лежит не в корне домена (например, GitHub Pages
`https://user.github.io/repo/`), укажи путь в `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [vue()],
  base: '/repo/',
})
```

и пересобери проект.

## Структура

- `index.html` — подключает официальный скрипт
  `https://telegram.org/js/telegram-web-app.js`
- `src/telegram.ts` — типы и безопасный доступ к `window.Telegram.WebApp`
- `src/App.vue` — запуск (`ready()`, `expand()`), тема, баннер вне Telegram
- `src/components/UserCard.vue` — данные пользователя
- `src/components/DemoControls.vue` — MainButton, BackButton, haptics

## Полезные ссылки

- Документация Mini Apps: https://docs.telegram-mini-apps.com/
- Официальная документация Telegram: https://core.telegram.org/bots/webapps
