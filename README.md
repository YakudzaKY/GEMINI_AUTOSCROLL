# Gemini Helper — автоскролл и автосейв для Gemini

Этот расширенный помощник для Gemini в Chrome/Chromium решает две реальные проблемы интерфейса:

- Автоскролл: во время генерации поток у Gemini может обрываться, если список сообщений не «прижат» к низу. Длинные ответы недописываются, а соединение кажется «потерянным». Автоскролл мягко поддерживает позицию внизу, чтобы стрим доходил до конца.
- Автосейв: при прерывании генерации Gemini иногда удаляет своё незавершённое сообщение. Если это была первая пара запрос–ответ, может исчезнуть весь чат. Автосейв делает локальные снимки последнего ответа и сохраняет их, чтобы вы ничего не потеряли.

Все данные хранятся локально, без сетевых запросов.

## Возможности

- Автоскролл во время стрима ответа.
- Автосохранение исчезающих ответов (история до 10 записей) с просмотром в попапе и копированием кода в один клик.
- Отдельные переключатели для каждого помощника: можно включить/выключить автоскролл и автосейв независимо.

## Установка

1. Откройте `chrome://extensions` и включите режим разработчика.
2. Нажмите «Загрузить распакованное» и укажите папку с этим проектом (там, где лежит `manifest.json`).

## Использование

- По умолчанию всё включено. Откройте `https://gemini.google.com`, начните генерацию — автоскролл удержит поток, а автосейв сохранит ответ, даже если он исчезнет.
- Закрепите иконку расширения на панели, чтобы попап всегда был под рукой.
- Нажмите на иконку расширения, чтобы открыть попап: разверните нужный ответ и получите доступ к последним сохранённым данным с предпросмотром, «сырым» HTML и кнопками копирования кода.

## Настройки

- Откройте страницу параметров расширения (через попап или `chrome://extensions`) и настройте:
  - `Автоскролл` — удерживает ленту у конца во время генерации.
  - `Автосейв` — снимает и сохраняет последний ответ, если он исчезает.

## Известные проблемы

- При переключении в интерфейсе на другой чат или бота последний ответ Gemini тоже попадает в автосейв. Интерфейс посылает событие удаления, и расширение сохраняет ответ, полагая, что он исчез. Привязка сохранения к активности кнопки `[Stop]` не подходит: при ошибках Gemini сначала отключает кнопку, а только потом очищает поток.

---

## English

Gemini Helper for Chrome/Chromium turns a one‑trick autoscroll into a practical helper:

- Auto‑Scroll: Gemini may stop streaming if the chat isn’t pinned to the bottom. Long answers get cut short and appear as failed. Auto‑Scroll gently keeps the view at the tail so the stream completes.
- Auto‑Save: When generation is interrupted, Gemini sometimes deletes its own pending message — and if it was the first request‑response pair, the entire chat can disappear. Auto‑Save snapshots the latest response locally so you don’t lose it.

All data stays local; no network requests.

## Features

- Auto‑scroll during streaming.
- Auto‑save disappearing responses (up to 10 recent items) with popup preview and one‑click code copy.
- Separate toggles for each helper: enable/disable auto‑scroll and auto‑save independently.

## Install

1. Open `chrome://extensions` and enable Developer mode.
2. Click “Load unpacked” and select this project folder (the one with `manifest.json`).

## Usage

- Defaults are on. Visit `https://gemini.google.com` and start a generation — auto‑scroll keeps the stream alive, and auto‑save preserves the last response even if it vanishes.
- Pin the extension icon to the toolbar so the popup is always handy.
- Click the extension icon to open the popup: expand the saved response you need to browse recent snapshots with sandboxed preview, raw HTML, and copy buttons for code blocks.

## Settings

- Use the Options page (via popup or `chrome://extensions`) to configure:
  - `Auto‑Scroll` — keeps the feed pinned to the bottom during generation.
  - `Auto‑Save` — snapshots and stores the latest response when it disappears.

## Known Issues

- Switching to a different chat or bot inside the Gemini interface also triggers an auto-save of the last response. The UI fires a deletion event, so the extension thinks the answer vanished and keeps it. Attempting to gate saving on the `[Stop]` button state failed, because on Gemini errors the button is disabled first and only then the response is cleared.

