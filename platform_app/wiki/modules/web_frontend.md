# Web Frontend

Веб-версия UI приложения UCP — порт Qt6/C++17 десктоп-оболочки на React. Не WASM-сборка Qt, а самостоятельный SPA с вычислительным ядром на WebAssembly.

## Location

`platform_app/web/`
Стек: React 18 + TypeScript (strict) + Vite 5. Без UI-библиотек.
Создан 2026-06-02. WASM-ядро, общая модель и доводка — 2026-06-09/10.

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
| `ModuleFactory` иерархия | `src/data/modules.ts` (`MODULE_TREE`, 25 узлов) |

Виды модулей сгруппированы по семействам: `schematic_family.tsx`, `protocol_family.tsx`, `codegen_exports.tsx`, `firmware.tsx`, плюс отдельные `*View.tsx`. Диспетчер — `src/modules/index.tsx`.

## Вычислительное ядро (WASM)

`wasm/` — Qt-free C++17, собирается Emscripten + embind в `public/wasm/ucp_core.{js,wasm}` (Vite копирует в `dist/`). `src/core/ucpCore.ts` грузит модуль (косвенный `import` через `document.baseURI`) или падает на **идентичный JS-фолбэк**; бейдж `engine: wasm|js`.

| Ядро (C++) | JS API | Используется в |
|------------|--------|----------------|
| `crc_compute` (`ucp_core.cpp`) | `crc()` | CRC Calculator |
| `pid_step` | `pidStep()` | PID Tuner |
| `rc_lowpass` | `rcLowpass()` | SPICE (RC-транзиент) |
| `connected_components` (union-find) | `connectedComponents()` | Netlist / DRC |
| `mna_dc` (узловой анализ, `ucp_core.cpp`) | `mnaDc()` | SPICE (DC operating point) |
| `csg_boxes` (BSP, `ucp_csg.cpp`) | `csg()` | Part Editor |

`mna_dc(numNodes, elements)` — решатель методом модифицированных узловых уравнений (MNA): элементы `{type, n1, n2, value}` (0=R, 1=V-источник, 2=I-источник), узел 0 = земля; матрица проводимостей + строки токов источников V, решение Гаусс-Жорданом с выбором ведущего → напряжения узлов. JS-фолбэк зеркалит C++ 1:1.

Сборка: `npm run build:wasm` (Linux/git-bash с extensionless emcc; на Windows — через cmd, см. [wasm/README](../../platform_app/web/wasm/README.md)).

## Общая модель проекта и поток данных

`src/project.ts` — `UcpProject { components, wires }` (формат `.ucp`), единый источник правды в store:

- **Schematic** редактирует компоненты (drag, multi-pin: U=6 выводов) и **провода** (режим Wire — клик по двум выводам); провода разводятся A*-роутером с объездом корпусов; **ERC** подсвечивает висящие выводы. Палитра — **библиотека компонентов** (`src/data/library.ts`): искомый список из 22 деталей по категориям (Passive/Diode/Transistor/IC/Connector); деталь несёт `kind/value/footprint` на компонент (`SchComponent.footprint`).
- **Netlist** выводит цепи из реальных проводов (union-find в ядре); экспорт **нетлиста** (`.net`).
- **SPICE** — RC-транзиент (`rcLowpass`) + **DC operating point**: узловой анализ делителя (`mnaDc` в ядре).
- **PCB** строит посадочные места и ratsnest из модели; **трассировка** A* с объездом футпринтов, последовательная (новая дорожка объезжает уложенные) и **двухслойная** (F.Cu/B.Cu + переходные отверстия); **DRC** (`runDrc`); экспорт **Gerber** (RS-274X) + Excellon drill; **BOM CSV** (группировка по value/типу, колонка Footprint).
- **3D Editor** — изометрический рендер платы с компонентами; **Part Editor** — настоящая CSG (WASM) с затенением.
- **File → Save/Open** (`.ucp`), **импорт** `.net` (полный) и `.kicad_sch` (компоненты + цепи по геометрии); автосейв в `localStorage`, **undo/redo** (Edit-меню, Ctrl+Z/Y, коалесинг перетаскивания).

Остальные модули (Protocol, CodeGen-экспортёры, UI Designer, AI, OTA, Firmware, Agent) — интерактивные виды на демо-данных.

## Роутер (`src/routing.ts`)

`routeOrthogonal(a, b, obstacles)` — A* по сетке (шаг 8px, зазор, штраф за поворот) с объездом прямоугольных препятствий; `routeOrthogonalEx` дополнительно возвращает флаг `found`. Используется и в Schematic (объезд корпусов), и в PCB (объезд футпринтов). PCB-разводка последовательная (уложенные дорожки → препятствия) и двухслойная: если на F.Cu пути нет (`found=false`) — дорожка уходит на B.Cu с переходными отверстиями. Подробности и тюнинг — скилл `/ucp-web-route`.

## Импорт (`importNetlist`, `importKicadSch` в `src/project.ts`)

- **`.net`** (KiCad/Tango S-expr) — полный импорт: компоненты + цепи (звезда по узлам).
- **`.kicad_sch`** — компоненты с раскладкой KiCad + цепи по **геометрии**: точки пинов из `lib_symbols` × трансформация инстанса (позиция/поворот/зеркало, Y-flip) → union-find по совпадающим точкам проводов. Ограничение: только прямая проводная связность (net-метки / power-символы / иерархия не разрешаются).

## Тесты, CI, деплой

- **Vitest** (`npm test`, 35) — ядро/модель/роутер: CRC-векторы, union-find, **MNA-делитель** (закон Ома), pid/rc, CSG, round-trip `.ucp`, провода, DRC, экспорт/импорт нетлиста, `.kicad_sch`, A*-роутер (объезд/флаг found), целостность библиотеки + футпринт в BOM.
- **Playwright** (`npm run test:e2e`) — e2e-смоук (рендер 25 модулей, поток Schematic→Netlist).
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
