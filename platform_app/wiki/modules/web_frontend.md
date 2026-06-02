# Web Frontend

Веб-версия UI приложения UCP — порт Qt6/C++17 десктоп-оболочки на React. Не WASM-сборка Qt, а самостоятельный SPA.

## Location

`platform_app/web/`
Стек: React 18 + TypeScript (strict) + Vite 5. Без UI-библиотек.
Создан 2026-06-02 (первый коммит репозитория, только `platform_app/web/`).

## Architecture

Оболочка повторяет десктоп 1:1 (см. `app/main_window.cpp`):

| Часть десктопа | Веб-аналог |
|----------------|------------|
| `QMenuBar` (File/Modules/View/Help) | `src/components/MenuBar.tsx` |
| `QTreeWidget` дерево модулей | `src/components/ModuleTree.tsx` |
| `QStackedWidget` рабочая область | `src/components/Workspace.tsx` → `ModuleView` |
| `QStatusBar` | `src/components/StatusBar.tsx` |
| `applyTheme("dark")` палитра | `src/theme.css` (CSS-переменные + светлая тема) |
| `EventBus` + `Project` | `src/store.ts` (`UcpContext`/`useUcp`) |
| `ModuleFactory` иерархия | `src/data/modules.ts` (`MODULE_TREE`, 25 узлов) |

Виды модулей сгруппированы по семействам: `schematic_family.tsx`, `protocol_family.tsx`, `codegen_exports.tsx`, `firmware.tsx`, плюс отдельные `*View.tsx`. Диспетчер — `src/modules/index.tsx`. Общий `common.tsx` (`PanelHead`, `GenericPanel`).

## Реализованные виды

Все 25 модулей интерактивны (данные — мок/демо, без реальной C++/HAL-логики):

- **Schematic** — SVG drag&drop компонентов с привязкой к сетке + свойства; Symbol Editor (пины), Wire Tool, Netlist, SPICE (анимированная осциллограмма на canvas)
- **PCB** — слои F.Cu/B.Cu/F.SilkS/Edge.Cuts, посадочные места, дорожки, ratsnest, DRC, Gerber
- **3D** — CSS-3D вращаемый куб + CSG subtract + STEP; Part Editor (примитивы/параметры)
- **PID Tuner** — живой график переходного процесса + метрики overshoot/settling
- **Program System** — FSM Greenhouse/Fan/Washer
- **Protocol** — Sequence/Packet/UART Monitor (симуляция RX)/Analyzer
- **CodeGen** — CRC (реальный расчёт CRC-8/16/32), LVGL/Arduino/Protocol Code Gen
- **UI Designer** — 15 LVGL-виджетов drag&drop; **AI Schematic**; **OTA Flash** (симуляция esptool); **Firmware Project** (сушилка/паяльник); **Agent Runner**

## Build & Run

```bash
cd platform_app/web
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build → dist/  (~206 КБ)
```

Проверено browser-harness: все 25 модулей рендерятся, 0 JS-ошибок; CRC-32("123456789")=0xCBF43926.

## Next

Вынести C++-ядро в WASM/REST, чтобы веб-UI вызывал реальную логику вместо мок-данных. См. [Tech Stack](../architecture/tech_stack.md) (Emscripten уже в стеке) и `/ucp-web` skill.
