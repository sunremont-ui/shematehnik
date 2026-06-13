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

`src/project.ts` — `UcpProject{components, wires, labels, tracks, board, userParts}` и `.ucp` v2 envelope `{version:2, project, design}`. В одном файле сохраняются schematic/PCB и design-store (`uiProject`/legacy `uiDesign`, `packet`, `fsm`, `regMap`); legacy `.ucp` v1 открывается без миграционного шума.

| Модуль | Что работает |
|--------|--------------|
| Schematic | drag&drop компонентов, multi-pin (U=6), рисование проводов с **A*-разводкой** (объезд корпусов), **ERC** |
| Netlist | цепи из проводов (union-find), экспорт `.net` |
| PCB | футпринты + ratsnest; **трассировка A*** (объезд), последовательная + **двухслойная** F.Cu/B.Cu с vias; **DRC**; экспорт **Gerber** (RS-274X) |
| 3D Editor | изометрический рендер платы с компонентами |
| Part Editor | настоящая **CSG** (union/subtract/intersect) в WASM с затенением |
| PID Tuner | живой график переходного процесса, метрики; Live-режим читает Web Serial |
| SPICE | DC/SWEEP/TRAN/AC по реальной топологии схемы через TS MNA-движок |
| Filter Designer | RC/RLC/active фильтры, Боде-график через общий `acSweep`, CSV-экспорт |
| Pin Planner | MCU pinout planner: назначения функций, конфликты, SVG-корпус, генерация init-кода |
| EE Calculators | делитель напряжения, LED-резистор с E12, IPC-2221 ширина дорожки, тепловой расчёт LDO |
| Logic Analyzer | импорт VCD/CSV, canvas тайминг-диаграмма, курсоры и декод UART/I2C/SPI |
| Power Budget | оценка потребления по BOM, группировка по power-net labels, лимиты шин и overload warnings |
| Register Map | редактор регистров и bit fields, генерация C-header и Markdown-документации |
| CRC Calculator | CRC-8/16/32 (реальный расчёт ядром) |
| File | Save/Open `.ucp` v2 через File System Access API при наличии поддержки, Recent handles в IndexedDB, **импорт** `.net` и `.kicad_sch`, автосейв проекта + design-store; undo/redo пока только для `UcpProject` |

Следующий исследовательский контур: **LVGL Lab / UI Designer 2.0** в `../../platform_app_lab/projects/lvgl-exporter-improvement-v0/` — multi-screen, styles/themes, events/actions, assets/layouts и golden-output тесты для будущего расширения LVGL Export.

Protocol Analyzer декодирует Packet Editor/UART capture, Logic Analyzer разбирает сигналовые VCD/CSV-захваты, Program System генерирует C FSM, AI Schematic может размещать схему через ключ пользователя в браузере; OTA/Firmware/Agent пока остаются частично симуляционными.

Роутер `src/routing.ts` (A* с объездом препятствий) — общий для Schematic и PCB; см. скилл `/ucp-web-route`.
3D/Part Editor загружаются лениво (`React.lazy`): основной bundle не тянет `three.js` до открытия 3D-модуля.
PWA включён в production build: manifest + service worker дают standalone install и offline app shell.
Каждый модуль защищён `ModuleErrorBoundary`: падение view показывает локальную карточку ошибки, оболочка остаётся живой.
Ctrl+K открывает command palette для быстрого перехода по модулям и базовых shell-действий.

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
