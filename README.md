# GEMINI Autoscroll Extension

## 🇬🇧 English

An unpacked Chrome/Chromium extension that keeps the Gemini web chat (`https://gemini.google.com`) pinned to the latest response. The native interface stops rendering when the viewport leaves the streaming area, so long answers get truncated and Gemini reports a connection failure. The content script watches for new DOM nodes and scrolls to the bottom at the right cadence, keeping the response pipeline "alive" until the end.

### Why Google's UI Needs Help

- When the response grows, the freshly appended nodes drop out of Gemini's "active" zone; the streaming pipeline stops delivering tokens even though the connection is fine.
- Long answers are not merely truncated—the generation is aborted, the pending message disappears, and the request can wipe the entire thread if it was the conversation opener.
- The extension nudges the scroll position so the newest nodes stay active and Gemini finishes streaming every token.

### Installation

1. Clone the repository: `git clone https://github.com/YakudzaKY/GEMINI_AUTOSCROLL.git`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked**, select the cloned repository folder (the one that contains `manifest.json`), and confirm.

### How It Works

- `content.js` injects a filtered `MutationObserver` into the chat history.
- When Gemini appends meaningful elements (`<p>`, images, tables, code blocks, etc.), the script schedules a throttled, animation-frame-aligned scroll to the bottom.
- Scrolls run only while the stop button is visible, preventing accidental jumps during idle states.
- When the last `<model-response>` disappears from the feed, the script captures its HTML and stores it for the popup to preview or export.
- The extension popup keeps the most recent `<model-response>` snapshots with a sandboxed preview and raw HTML for quick retrieval.
- Code blocks inside the popup preview expose a one-click copy button for quick reuse.

### Files

- `manifest.json` — extension manifest in the repository root.
- `content.js` — DOM observer and autoscroll logic.
- `popup.html` — popup markup for browsing captured responses.
- `popup.js` — popup logic that renders previews and keeps the list in sync.
- `popup.css` — lightweight styling for the popup layout.
- `icons/` — toolbar icon assets for the extension action.

Everything executes locally; no external dependencies required.

---

## 🇷🇺 Русский

Распакованное расширение для Chrome/Chromium, которое удерживает веб-чат Gemini (`https://gemini.google.com`) на последнем сообщении. В стандартном интерфейсе, если область просмотра выходит за пределы стриминга, нижние блоки становятся «неактивными», Gemini решает, что связь потеряна, и обрывает длинные ответы. Контент-скрипт отслеживает появление новых узлов и своевременно прокручивает чат до конца, позволяя модели договорить до последнего символа.

### Зачем это нужно

- При росте ответа новые блоки вываливаются из "активной" зоны Gemini; фронтенд перестаёт принимать токены, хотя соединение не рвётся.
- Длинные ответы не просто обрезаются — генерация отменяется, сообщение исчезает, а если это был первый запрос в чате, пропадает весь диалог.
- Расширение возвращает прокрутку к активным узлам, и Gemini успевает договорить ответ до конца.

### Установка

1. Склонируйте репозиторий: `git clone https://github.com/YakudzaKY/GEMINI_AUTOSCROLL.git`.
2. Откройте `chrome://extensions` и включите **Режим разработчика**.
3. Нажмите **Загрузить распакованное расширение** и укажите корневую папку репозитория (там лежит `manifest.json`), затем подтвердите.

### Как работает

- `content.js` ставит точечный `MutationObserver` на ленту сообщений Gemini.
- При добавлении значимых элементов (абзацы, изображения, таблицы, код) скрипт планирует прокрутку, синхронизированную с `requestAnimationFrame`, и повторяет её только при необходимости.
- Скролл запускается, только если на экране видна кнопка остановки генерации, чтобы не мешать статичным диалогам.
- Как только исчезает `<model-response>`, скрипт сохраняет его HTML для всплывающего окна, чтобы успеть забрать нужное содержимое.
- В окне расширения (значок на панели) всегда под рукой свежий список `<model-response>` с изолированным предпросмотром и исходным HTML.
- В предпросмотре кода во всплывающем окне появилась кнопка «Копировать» в один клик.

### Файлы

- `manifest.json` — манифест расширения в корне репозитория.
- `content.js` — логика наблюдения за DOM и автоскролла.
- `popup.html` — разметка всплывающего окна со списком удалённых ответов.
- `popup.js` — логика окна: предпросмотр и синхронизация списка.
- `popup.css` — минимальное оформление всплывающего окна.
- `icons/` — иконки для кнопки расширения в панели.

Расширение работает полностью локально и не требует сторонних зависимостей.
