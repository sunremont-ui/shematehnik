# UCP Web — веб-фронтенд

Веб-версия UI приложения **Universal Controller Platform** (порт Qt6/C++17 десктоп-оболочки на React + TypeScript + Vite).

Повторяет оболочку десктопа:

- **Menu bar** — File / Edit / Modules / View / Help (горячие клавиши, undo/redo).
- **Дерево модулей** слева — вся иерархия из `core/module_factory`.
- **Рабочая область** — стек виджетов с keep-alive (состояние вкладок сохраняется).
- **Status bar** — сообщения EventBus `status.message`, текущий модуль, версия.
- **Тема** — GitHub-dark 1:1 с `MainWindow::applyTheme("dark")` + светлая + адаптив.

## Вычислительное ядро (WASM)

`wasm/` (Qt-free C++17, Emscripten + embind) → `public/wasm/ucp_core.{js,wasm}`,
грузится `src/core/ucpCore.ts` (или идентичный JS-фолбэк; бейдж `engine: wasm|js`):
`crc`, `pidStep`, `rcLowpass` (RC-транзиент), `connectedComponents` (union-find),
`csg` (BSP-операции). Пересборка: `npm run build:wasm`.

## Общая модель и поток данных

`src/project.ts` — `UcpProject{components, wires}` (формат `.ucp`), единый источник правды:

| Модуль | Что работает |
|--------|--------------|
| Schematic | drag&drop компонентов, multi-pin (U=6), рисование проводов с **A*-разводкой** (объезд корпусов), **ERC** |
| Netlist | цепи из проводов (union-find), экспорт `.net` |
| PCB | футпринты + ratsnest; **трассировка A*** (объезд), последовательная + **двухслойная** F.Cu/B.Cu с vias; **DRC**; экспорт **Gerber** (RS-274X) |
| 3D Editor | изометрический рендер платы с компонентами |
| Part Editor | настоящая **CSG** (union/subtract/intersect) в WASM с затенением |
| PID Tuner | живой график переходного процесса, метрики |
| SPICE | RC-транзиент из ядра, осциллограмма V(in)/V(out) |
| CRC Calculator | CRC-8/16/32 (реальный расчёт ядром) |
| File | Save/Open `.ucp`, **импорт** `.net` и `.kicad_sch` (компоненты+цепи), автосейв, undo/redo |

Остальные модули (Protocol, CodeGen-экспортёры, UI Designer, AI, OTA, Firmware, Agent) — интерактивные виды на демо-данных.

Роутер `src/routing.ts` (A* с объездом препятствий) — общий для Schematic и PCB; см. скилл `/ucp-web-route`.

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
