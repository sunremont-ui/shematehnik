# UCP Web — веб-фронтенд

Веб-версия UI приложения **Universal Controller Platform** (порт Qt6/C++17 десктоп-оболочки на React + TypeScript + Vite).

Повторяет оболочку десктопа:

- **Menu bar** — File / Modules / View / Help (с горячими клавишами).
- **Дерево модулей** слева — вся иерархия из `core/module_factory` (Schematic→SPICE, Protocol→…, CodeGen→… и т.д.).
- **Рабочая область** — стек виджетов выбранного модуля.
- **Status bar** — сообщения EventBus `status.message`, текущий модуль, версия.
- **Тема** — GitHub-dark палитра 1:1 с `MainWindow::applyTheme("dark")` + светлая.

## Реализованные интерактивные модули

| Модуль | Что работает |
|--------|--------------|
| Schematic Editor | SVG-канва, палитра компонентов, drag&drop с привязкой к сетке, свойства |
| PID Tuner | живой график переходного процесса (canvas), метрики overshoot/settling |
| CRC Calculator | реальный расчёт CRC-8/16/32 (CCITT, MODBUS) |
| UI Designer | палитра 15 виджетов LVGL, drag&drop на «экране», свойства |
| OTA Flash | симуляция прошивки esptool с прогрессом и логом |
| AI Schematic | имитация запроса к Claude API → netlist |
| Program System | конечные автоматы Greenhouse/Fan/Washer |

Остальные модули представлены навигируемыми панелями (порт логики — итеративно).

## Запуск

```bash
cd platform_app/web
npm install
npm run dev      # http://localhost:5173
```

Сборка прод-версии: `npm run build` → `dist/`.

## Тесты

```bash
npm test          # Vitest — юнит-тесты ядра и модели
npm run test:e2e  # Playwright — e2e-смоук (поднимает preview)
```

## Деплой

`base: "./"` (относительные пути) + загрузка wasm через `document.baseURI`
→ работает на любом subpath. Воркфлоу [deploy-web.yml](../../.github/workflows/deploy-web.yml)
собирает wasm + бандл и публикует `dist/` на **GitHub Pages** при push в
master/main (нужно включить Pages → Source: GitHub Actions в настройках репо).
