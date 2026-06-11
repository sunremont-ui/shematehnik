# UCP Web Implement: System Hygiene — Code-split, FS Access, PWA, Error Boundary, Palette

Phase 16.2–16.6 (`wiki/roadmap-web.md`). Independent small items — implement and
commit each separately.

## 16.2 Code-split three.js (~767 КБ → ~250 КБ main)

- `src/three/ThreeStage.tsx` и `exporters.ts` — единственные потребители `three`.
  Сделать `ThreeStage` lazy: `const ThreeStage = React.lazy(() => import("../three/ThreeStage"))`
  + `<Suspense fallback={спиннер}>` в ThreeDView/PartEditorView; exporters —
  динамический `import()` по клику Export.
- Проверить: `npm run build` → main chunk < 300 КБ, three в отдельном chunk;
  e2e three-тест по-прежнему зелёный (Suspense → дождаться canvas).

## 16.3 File System Access API

- `src/util.ts`: `saveFile(name, text)` — `window.showSaveFilePicker` (Chrome/Edge),
  фолбэк на текущий `downloadText`. Хранить handle последнего файла → File→Save
  перезаписывает без диалога, File→Save As — новый диалог.
- File→Open через `showOpenFilePicker` (фолбэк `<input type=file>`).
- Recent files: имена + handles в `localStorage`/IndexedDB (handle сериализуется
  только в IndexedDB!) → подменю File→Recent.

## 16.4 PWA

- `public/manifest.webmanifest` (name UCP, иконки 192/512 — сгенерировать простые SVG→PNG, theme #0d1117) + `<link rel=manifest>`.
- Service worker: без плагинов — простой `public/sw.js` cache-first для same-origin
  GET (precache по списку из build не делаем; runtime-кэш достаточно), регистрация
  в `main.tsx` (только prod). Внимание: не кэшировать `wasm/*.js` со старой версией —
  ключ кэша с версией из `import.meta.env`.

## 16.5 Error boundary per module

- `src/components/ModuleBoundary.tsx` — классовый ErrorBoundary: карточка
  «Модуль упал: <name>» + сообщение + кнопка Reset (сброс state boundary → ремоунт).
  Обернуть каждый модуль в Workspace. console.error не глотать.
- e2e: форс-ошибка (dev-only кнопка или window-хук) → оболочка живёт, другие модули работают.

## 16.6 Command palette (Ctrl+K)

- Оверлей-инпут: fuzzy-фильтр по `MODULE_INDEX` (name/title/blurb) + действия
  (Save/Open/Theme/Undo). ↑↓ + Enter, Esc. Клавиша: Ctrl+K (и Ctrl+P как алиас).
  Стиль — существующие CSS-переменные, role=listbox + aria.

## After implementing

Tick по пунктам, log entries, `/ucp-web` после каждого.
