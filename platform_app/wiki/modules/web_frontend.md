# Web Frontend

Веб-версия UI приложения UCP — порт Qt6/C++17 десктоп-оболочки на React. Не WASM-сборка Qt, а самостоятельный SPA с вычислительным ядром на WebAssembly.

## Location

`platform_app/web/`
Стек: React 18 + TypeScript (strict) + Vite 5. Без UI-библиотек.
Создан 2026-06-02. WASM-ядро, общая модель и доводка — 2026-06-09/10.
Фаза 8 «по-настоящему» завершена 2026-06-10 (реальный SPICE, three.js, генераторы); фаза 9 (амбиции) снята с плана.

## Architecture

Оболочка повторяет десктоп 1:1 (см. `app/main_window.cpp`):

| Часть десктопа | Веб-аналог |
|----------------|------------|
| `QMenuBar` (File/Edit/Modules/View/Help) | `src/components/MenuBar.tsx` |
| `QTreeWidget` дерево модулей | `src/components/ModuleTree.tsx` (role=tree, клавиатура) |
| `QStackedWidget` рабочая область | `src/components/Workspace.tsx` (keep-alive вкладок) |
| `QStatusBar` | `src/components/StatusBar.tsx` (aria-live) |
| `applyTheme("dark")` палитра | `src/theme.css` (CSS-переменные + светлая + адаптив) |
| `EventBus` + `Project` | `src/store.ts` (`UcpContext`/`useUcp`) |
| `core/*` алгоритмы | `wasm/` (Emscripten) ↔ `src/core/ucpCore.ts` |
| `ModuleFactory` иерархия | `src/data/modules.ts` (`MODULE_TREE`, 31 узел) |

Виды модулей сгруппированы по семействам: `schematic_family.tsx`, `protocol_family.tsx`, `codegen_exports.tsx`, `firmware.tsx`, плюс отдельные `*View.tsx`. Диспетчер — `src/modules/index.tsx`.

## Вычислительное ядро (WASM)

`wasm/` — Qt-free C++17, собирается Emscripten + embind в `public/wasm/ucp_core.{js,wasm}` (Vite копирует в `dist/`). `src/core/ucpCore.ts` грузит модуль (косвенный `import` через `document.baseURI`) или падает на **идентичный JS-фолбэк**; бейдж `engine: wasm|js`.

| Ядро (C++) | JS API | Используется в |
|------------|--------|----------------|
| `crc_compute` (`ucp_core.cpp`) | `crc()` | CRC Calculator |
| `pid_step` | `pidStep()` | PID Tuner |
| `rc_lowpass` | `rcLowpass()` | (демо RC, ист. в ядре) |
| `connected_components` (union-find) | `connectedComponents()` | Netlist / DRC |
| `mna_dc` (узловой анализ, `ucp_core.cpp`) | `mnaDc()` | базовый DC-векторный тест |
| `csg_boxes` (BSP, `ucp_csg.cpp`) | `csg()` | Part Editor (меш в three.js) |

Полноценный SPICE-движок вынесен в TS — `src/spice.ts` (см. ниже): DC/TRAN/AC по реальной топологии схемы, детерминирован, покрыт Vitest.

`mna_dc(numNodes, elements)` — решатель методом модифицированных узловых уравнений (MNA): элементы `{type, n1, n2, value}` (0=R, 1=V-источник, 2=I-источник), узел 0 = земля; матрица проводимостей + строки токов источников V, решение Гаусс-Жорданом с выбором ведущего → напряжения узлов. JS-фолбэк зеркалит C++ 1:1.

Сборка: `npm run build:wasm` (Linux/git-bash с extensionless emcc; на Windows — через cmd, см. [wasm/README](../../platform_app/web/wasm/README.md)).

## Общая модель проекта и поток данных

`src/project.ts` — `UcpProject` (components/wires/labels/tracks/board/userParts) и формат `.ucp` v2: top-level `{version:2, project, design}` хранит schematic/PCB плюс `uiProject`/legacy `uiDesign`, `packet`, `fsm`, `regMap`; legacy v1 без envelope открывается миграционно и не трогает design-store.

- **Schematic** редактирует компоненты (drag, multi-pin: U=6 выводов) и **провода** (режим Wire — клик по двум выводам); провода разводятся A*-роутером с объездом корпусов; **ERC** подсвечивает висящие выводы. Палитра — **библиотека компонентов** (`src/data/library.ts`): искомый список из 22 деталей по категориям (Passive/Diode/Transistor/IC/Connector); деталь несёт `kind/value/footprint` на компонент (`SchComponent.footprint`).
- **Netlist** выводит цепи из реальных проводов (union-find в ядре); экспорт **нетлиста** (`.net`).
- **SPICE** — **настоящий узловой анализ по топологии схемы** (`src/spice.ts`): узлы и номиналы (`parseValue`: `10k`/`100n`/`4.7u`) берутся из реальных компонентов R/C/L. Три режима: **DC** (`dcSolve`: C — обрыв, L — короткое), **TRAN** (`transient`: backward-Euler companion-модели C/L, шаг по времени), **AC** (`acSweep`: комплексный MNA, свип частоты → Боде |H| дБ + фаза). Источник возбуждения и точки source/ground/probe выбираются в панели (как `.op/.tran/.ac`). Экспорт `.cir`.
- **Filter Designer** — новый модуль фазы 17.1 поверх общего `acSweep`: RC low/high-pass, RLC low/band-pass и active low-pass approximation, расчёт `fc`/`Q`/BW, SVG Боде-график и CSV-экспорт точек АЧХ/ФЧХ.
- **Pin Planner** — новый модуль фазы 17.2: компактные MCU pinout-пресеты (STM32F103C8, ATmega328P/Uno, ESP32-C3), назначение функций на пины, подсветка конфликтов/предупреждений, SVG-корпус и генерация init-кода для STM32 HAL / Arduino / ESP-IDF.
- **EE Calculators** — новый модуль фазы 17.3: практичные расчёты делителя напряжения с нагрузкой, LED-резистора с ближайшим E12, ширины дорожки по IPC-2221 и теплового режима LDO; результат можно выгрузить в Markdown-отчёт.
- **Logic Analyzer** — новый модуль фазы 17.4 в Protocol family: `src/logic.ts` импортирует VCD (`$var`, timescale, scalar/vector changes) и CSV (`time,ch0,ch1...`), строит каналы, декодирует UART/I2C/SPI чистыми функциями; `LogicAnalyzerView.tsx` показывает canvas тайминг-диаграмму, zoom/pan, курсоры A/B и экспорт аннотаций CSV.
- **Power Budget** — новый модуль фазы 17.5: `src/power.ts` читает `UcpProject`, группирует компоненты по power-net labels (`VCC/3V3/5V/12V/...`), даёт дефолтные токи по kind/value, считает rail budgets/margins/overload warnings; `PowerBudgetView.tsx` даёт редактируемые токи нагрузок, лимиты шин, bar summary и CSV export.
- **Register Map** — новый модуль фазы 17.6: `design.ts` хранит `regMap` внутри `.ucp` v2 design-store; `codegen.ts` генерирует C header с адресами/масками/inline get/set и Markdown-документацию; `RegisterMapView.tsx` редактирует device/base/registers/fields и показывает live preview.
- **LVGL Lab / UI Designer 2.0** — следующий research-first контур после фазы 17: `platform_app_lab/projects/lvgl-exporter-improvement-v0/` фиксирует audit, LVGL v8/v9 compatibility, multi-screen state, minimal event callback stubs, `screen_load` actions, minimal bgColor/radius style tokens, `Image.assetId`, minimal `Panel.layout`, same-screen `Panel` child parents и golden-output критерии перед расширением `genLvgl()`; compact handoff для продолжения: `agent-handoff.md`.
- **PCB** строит посадочные места и ratsnest из модели; **трассировка** A* с объездом футпринтов, последовательная (новая дорожка объезжает уложенные) и **двухслойная** (F.Cu/B.Cu + переходные отверстия); **DRC** (`runDrc`); экспорт **Gerber** (RS-274X) + Excellon drill; **BOM CSV** (группировка по value/типу, колонка Footprint).
- **3D Editor** — **настоящий WebGL-меш платы на three.js** (`src/three/`): корпуса компонентов как боксы, OrbitControls (орбита/зум), экспорт бинарного **STL** + **STEP AP214** (triangulated shell). **Part Editor** — CSG (WASM-ядро) рендерится тем же three-вьюпортом, экспорт STL.
- **File → Save/Open** (`.ucp` v2), **импорт** `.net` (полный) и `.kicad_sch` (компоненты + цепи по геометрии); при наличии File System Access API Save пишет в реальный файл, Save As выбирает handle, Recent хранится в IndexedDB, иначе работает download/input fallback. Автосейв в `localStorage` сохраняет проект + design-store. **Undo/redo** (Edit-меню, Ctrl+Z/Y, коалесинг перетаскивания) пока покрывает только `UcpProject`, не `uiProject`/`packet`/`fsm`.

**Настоящие генераторы кода** (`src/codegen.ts`) поверх общего стора артефактов (`src/design.ts`, `useSyncExternalStore`):
- **UI Designer** Export C → `genLvglProject()` строит project-level `ui.c/ui.h` из экранов `uiProject` (15 типов LVGL); legacy `genLvgl()` остаётся для current-screen export, `uiDesign` служит single-screen compatibility wrapper. Минимальные event/action/style/asset/layout/parent поля уже проходят через `.ucp` и LVGL export.
- **Packet Editor** → `genPacketStruct()` (`#pragma pack` структура); поля в сторе `packet`, расшарены с **Protocol Code Gen** → `genProtoParser()` (C/Python, big-endian, авто-CRC по полю `crc`) и **Protocol Analyzer** → `decodePackets()` по UART/manual capture.
- **Program System** → SVG FSM-редактор (`fsm` store) + `genFsm()` C/H (`typedef enum`, `fsm_step()` switch-case, guard/action, `FSM_INITIAL`).
- **AI Schematic** → опциональный прямой запрос к Anthropic API с ключом пользователя в `localStorage`; без ключа остаётся demo fallback, результат размещается в `UcpProject`.
- **Arduino Export** → `genBlink()` параметрический (LED pin / baud / delay, Arduino-`.ino` или ESP-IDF `main.c`).
- **Sequence Diagram** → реальный экспорт **PNG** (SVG→canvas, инжект вычисленных CSS-переменных).
- **Register Map** → `genRegisterHeader()` + `genRegisterMarkdown()` из `regMap`.

Остальные модули (OTA, Firmware, Agent) — интерактивные виды на демо/симуляции (помечены); UART Monitor, Protocol Analyzer, Logic Analyzer, Program System и AI Schematic уже имеют реальные cross-module/железные режимы с fallback.

## Роутер (`src/routing.ts`)

`routeOrthogonal(a, b, obstacles)` — A* по сетке (шаг 8px, зазор, штраф за поворот) с объездом прямоугольных препятствий; `routeOrthogonalEx` дополнительно возвращает флаг `found`. Используется и в Schematic (объезд корпусов), и в PCB (объезд футпринтов). PCB-разводка последовательная (уложенные дорожки → препятствия) и двухслойная: если на F.Cu пути нет (`found=false`) — дорожка уходит на B.Cu с переходными отверстиями. Подробности и тюнинг — скилл `/ucp-web-route`.

## Импорт (`importNetlist`, `importKicadSch` в `src/project.ts`)

- **`.net`** (KiCad/Tango S-expr) — полный импорт: компоненты + цепи (звезда по узлам).
- **`.kicad_sch`** — компоненты с раскладкой KiCad + цепи по **геометрии**: точки пинов из `lib_symbols` × трансформация инстанса (позиция/поворот/зеркало, Y-flip) → union-find по совпадающим точкам проводов. Ограничение: только прямая проводная связность (net-метки / power-символы / иерархия не разрешаются).

## Тесты, CI, деплой

- **Vitest** (`npm test`, 140) — ядро/модель/роутер/SPICE/генераторы/Filter Designer/Pin Planner/EE Calculators/Logic Analyzer/Power Budget/Register Map: CRC-векторы, union-find, MNA-делитель, pid/rc, CSG, round-trip `.ucp` v2/v1, multi-screen `uiProject` persistence/migration, event/action/style/asset/layout/parent metadata persistence, провода, DRC, экспорт/импорт нетлиста, `.kicad_sch`, A*-роутер, библиотека+BOM; **`codegen.test.ts`** дополнительно проверяет LVGL event callback/screen-load action/style/image asset/Panel flex layout registration and Panel child-parent creation, Register Map C masks/inline helpers и Markdown tables, **`power.test.ts`** (дефолтные токи, группировка по шинам, overload, unassigned, CSV), **`logic.test.ts`** (CSV/VCD import, UART 0x55 @ 9600, I2C start+address), **`eecalc.test.ts`** (делитель с нагрузкой, подбор LED-резистора, IPC-2221 external/internal, LDO thermal), **`pinplanner.test.ts`** (конфликт, неподдерживаемая функция, Arduino init, STM32 HAL init), **`filter.test.ts`** (RC −3 дБ, high-pass, RLC band-pass, active gain + CSV), **`spice.test.ts`** (RC −3 дБ на fc, фаза −45°, τ→0.632·Vin), **`three/exporters.test.ts`** (STL/STEP).
- **Bundle hygiene** — `ThreeDView`/`PartEditorView` грузятся через `React.lazy`; стартовый JS chunk после фазы 16.6 ≈315.7 КБ, three.js живёт в отдельном lazy chunk ≈527.5 КБ.
- **PWA** — `manifest.webmanifest` + production-only `sw.js`: приложение устанавливается как standalone, кэширует app shell/WASM/assets и отдаёт `index.html` для offline navigation.
- **Stability** — каждый keep-alive модуль обёрнут в `ModuleErrorBoundary`, поэтому crash одного view показывает локальную fallback-карточку и не роняет shell.
- **Command palette** — Ctrl+K открывает поиск по модулям и быстрым действиям, поддерживает `↑/↓/Enter/Esc`, выбор модуля синхронизирует `?module=...`.
- **Playwright** (`npm run test:e2e`, 17 сценариев в smoke spec) — проход по всем 31 модулям без console-ошибок, Filter Designer Боде/CSV controls, Pin Planner package/init controls, EE Calculators divider/trace/thermal controls, Logic Analyzer timing canvas + UART/I2C decode, Power Budget load/rail controls, Register Map C/Markdown previews, SPICE DC/TRAN/AC, three.js WebGL-canvas, Web Serial fallback, PCB Pro, кросс-модуль UI Designer→LVGL и Schematic→Netlist.
- **CI** — джоба `web` в `.github/workflows/ci.yml` (vitest + emsdk + wasm + vite + chromium e2e).
- **Deploy** — `deploy-web.yml` публикует `dist/` на GitHub Pages; `base: "./"` → работает на любом subpath.

## Build & Run

```bash
cd platform_app/web
npm install
npm run dev          # http://localhost:5173
npm run build:wasm   # пересборка WASM-ядра (нужен emsdk)
npm run build        # tsc -b && vite build → dist/
```
