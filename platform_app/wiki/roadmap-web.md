# Web Frontend — Roadmap

Цель: полноценный браузерный EDA (схема → нетлист → плата → выгрузка для
производства), где реальная математика считается в WASM-ядре. См.
[Web Frontend](modules/web_frontend.md).

## ✅ Сделано (фазы 0–6)

| Фаза | Что |
|------|-----|
| 0 · Оболочка | Порт Qt-shell на React, 25 модулей, GitHub-dark тема, адаптив, a11y |
| 1 · WASM-ядро | `crc`, `pid_step`, `rc_lowpass`, union-find, CSG (BSP) + JS-фолбэк |
| 2 · Инфра | Prod-сборка wasm, Vitest+Playwright, CI, деплой GitHub Pages |
| 3 · Модель | `.ucp` (components+wires), поток Schematic→Netlist→PCB→3D, multi-pin, undo/redo, autosave, keep-alive |
| 4 · Проверки | DRC, ERC, экспорт нетлиста/Gerber |
| 5 · Разводка | A*-роутер с объездом (Schematic+PCB), последовательная, двухслойная F.Cu/B.Cu + vias |
| 6 · Импорт | `.net` (полный), `.kicad_sch` (компоненты + цепи по геометрии) |
| 7 · Fab + редактор | BOM CSV, F.Cu/B.Cu Gerber + Excellon drill, net-метки (связь без провода), поворот компонентов (R) |
| 8 · «По-настоящему» (✅) | Библиотека компонентов, реальный SPICE (DC/TRAN/AC по топологии), 3D на three.js + STL/STEP, настоящие генераторы (LVGL/пакет/Arduino) |

## ✅ Фаза 7 — полный fab-комплект (done)

1. ✅ **BOM-экспорт CSV** — группировка по value/типу.
2. ✅ **F.Cu/B.Cu Gerber + Excellon drill** — комплект файлов для производства.
3. ✅ **Net-метки / power** (GND/VCC) — связность без проводов; учитываются в Netlist/DRC.
4. ✅ **Поворот компонентов** (R) — символ+выводы+пады, переразводка проводов.

## ✅ Фаза 8 — «по-настоящему» (done)

1. ✅ **Библиотека компонентов** (8.1) — `src/data/library.ts`: 22 искомых детали по
   категориям (Passive/Diode/Transistor/IC/Connector) вместо 6 дженерик-кнопок.
   Деталь несёт `kind/value/footprint` на компонент; BOM получил колонку Footprint.
2. ✅ **SPICE — MNA DC-решатель** (8.2) — `mna_dc` в WASM-ядре (+JS-фолбэк 1:1):
   узловой анализ (R / источники V и I), Гаусс-Жордан.
3. ✅ **SPICE — транзиент/AC по реальной топологии** (`src/spice.ts`): узлы и
   номиналы из схемы (парсер `10k`/`100n`), DC/TRAN (backward-Euler companion C/L)/
   AC (комплексный MNA, Боде). Порты источника/probe выбираются в панели. Vitest:
   RC −3 дБ на fc, фаза −45°, τ→0.632·Vin.
4. ✅ **3D на three.js** — реальный WebGL-меш платы (`src/three/`), OrbitControls,
   бинарный STL + STEP AP214 (triangulated shell); Part Editor — CSG-меш в three.
5. ✅ **Настоящие генераторы** (`src/codegen.ts` + общий стор `src/design.ts`):
   LVGL ui.c/ui.h из реальных виджетов UI Designer; парсер пакета C/Python и
   C-struct из Packet Editor; параметрический Arduino/ESP-IDF; Sequence → PNG.

## ~~Фаза 9 — амбиции~~ (отменена)

Снято с плана 2026-06-10. Полный WASM-порт десктоп-ядра, AI Schematic через
Claude API и облачные/совместные сценарии — вне области веб-фронтенда.
(AI через ключ пользователя в браузере вернулось ограниченно в фазе 15.)

---

# Цикл 2 — фазы 10–17 (план 2026-06-10)

По итогам исследования: граница «реальное/мок» проходит через UART/OTA/AI/
Programs/Analyzer; SPICE линейный; PCB-DRC без зазоров. Приоритет: 10 → 11 → 12,
дальше по обстоятельствам. У каждого пункта — скилл `/ucp-web-impl-*` с полным
контекстом реализации.

## Фаза 10 — Web Serial: железо из браузера 🔌

Превращает мок-модули в реальные инструменты для STM32/ESP32 (Chrome/Edge,
`navigator.serial`). Скиллы: `/ucp-web-impl-serial`, `/ucp-web-impl-ota`.

1. [x] **Serial-слой** `src/serial.ts` — open/close/read/write, feature-detect, общий порт между модулями
2. [x] **UART Monitor реальный** — подключение к порту, hex/ascii, TX; симуляция остаётся фолбэком
3. [x] **PID Tuner live** — телеметрия с реального устройства (сушилка/паяльник) на график
4. [x] **OTA Flash через esptool-js** — реальная прошивка ESP32 из браузера

## Фаза 11 — SPICE 2.0: нелинейные элементы 📈

Библиотека содержит D/Q, решатель их игнорирует. Скилл: `/ucp-web-impl-spice-nonlinear`.

1. [x] **Диод** — модель Шокли, Ньютон-Рафсон поверх MNA (DC + TRAN + AC-линеаризация)
2. [x] **BJT / MOSFET** — Эберс-Молл (транспортная) / level 1, NPN/PNP/N-MOS/P-MOS
3. [x] **DC sweep** + второй источник V2 (питание транзисторных схем)
4. [x] **График**: два перетаскиваемых курсора (A/B/Δ), экспорт CSV всех анализов

## Фаза 12 — PCB Pro 🟩

Скиллы: `/ucp-web-impl-pcb-drc`, `/ucp-web-impl-pcb-edit`.

1. [x] **Clearance-DRC** — зазоры дорожка-дорожка / дорожка-пад / пад-пад, настраиваемый clearance (min width не проверяется — ширина фиксированная)
2. [x] **Ручное редактирование дорожек** — дорожки в модели `.ucp` (undo/redo), select / drag сегмента / Del / Reroute
3. [x] **Copper pour** — заливка выбранной цепи на F.Cu растровыми полосами (без термобарьеров — прямое подключение)
4. [x] **Контур платы + silkscreen** — Edge_Cuts.gbr (размер платы в модели) + F_Silkscreen.gbr (рамки + пин-1; ref-текст не выводится)
5. [x] **Pick-and-place CSV** — `-pos.csv`, мм от угла платы, Ref/Val/Package/Pos/Rot/Side

## Фаза 13 — Schematic UX ✏️

Скилл: `/ucp-web-impl-sch-ux`.

1. [x] Multi-select (рамка) + групповое перемещение/удаление
2. [x] Copy/paste (Ctrl+C/V) с переименованием ref
3. [x] Junction dots на T-соединениях проводов
4. [x] Правка value/ref по месту (двойной клик)
5. [x] ERC: типы пинов (power/in/out), конфликт выходов

## Фаза 14 — Библиотека и пользовательские детали 📚

Скилл: `/ucp-web-impl-library`.

1. [x] **Symbol Editor → библиотека**: создание своей детали (kind/пины/футпринт), persist в localStorage + `.ucp`
2. [x] **Импорт `.kicad_sym`** — пополнение библиотеки из KiCad
3. [x] Расширение штатной библиотеки (50+ деталей, поиск)

## Фаза 15 — Кросс-модули: демо → генераторы 🔁

Скиллы: `/ucp-web-impl-fsm`, `/ucp-web-impl-analyzer`, `/ucp-web-impl-ai`.

1. [x] **Program System** — визуальный FSM-редактор (состояния/переходы) → генерация C (switch-case)
2. [x] **Protocol Analyzer реальный** — декод захвата UART Monitor по описанию из Packet Editor (стор `design.ts`)
3. [x] **AI Schematic** (опционально) — прямой запрос к Claude API с ключом пользователя (`anthropic-dangerous-direct-browser-access`), ответ → размещение в `UcpProject`

## Фаза 16 — Системная гигиена 🧹

Скиллы: `/ucp-web-impl-project-v2`, `/ucp-web-impl-system`.

1. [x] **`.ucp` v2** — все артефакты в одном файле (schematic + uiProject/legacy uiDesign + packet + PID + FSM), миграция v1
2. [x] **Code-split three.js** — lazy import (~767 КБ → ~250 КБ основной бандл)
3. [x] **File System Access API** — Save в реальный файл, recent files
4. [x] **PWA** — манифест + service worker, установка как приложение
5. [x] **Error boundary на модуль** — падение вида не роняет оболочку
6. [x] **Command palette** (Ctrl+K) — быстрый переход по модулям

## Фаза 17 — Новые модули ➕

Скилл: `/ucp-web-impl-new-modules` (+ `/ucp-web-module` как шаблон).

1. [x] **Filter Designer** — RC/RLC/активные фильтры, АЧХ через готовый `acSweep`
2. [x] **Pin Planner** — раскладка пинов MCU (мини-CubeMX) + генерация init-кода
3. [x] **EE Calculators** — делитель, резистор LED, ширина дорожки, теплоотвод LDO
4. [x] **Logic Analyzer** — импорт VCD/CSV, тайминг-диаграмма, декод I2C/SPI/UART
5. [x] **Power Budget** — потребление по BOM и шинам питания
6. [x] **Register Map** — карта регистров → C-header + Markdown-доки

## Следующий контур — LVGL Lab / UI Designer 2.0

Статус: lab in progress; L0/L1/L3 done, L2/L4 multi-screen generator, UI state / `.ucp` migration wrapper, minimal event callback slice, minimal screen-load action routing, minimal style-token slice, minimal Image asset placeholder, project asset manifest (id/src + missing-asset report), binary asset pipeline (inline RGB565 + RGB565A8/alpha `lv_img_dsc_t`), widget hidden/opacity, minimal Panel flex layout + full main/cross/track align, per-child flex grow and minimal Panel child-parent slice done; next candidate is nested/responsive layout work, richer action graph or LVGL v9 mode (research-first). Лаборатория: `platform_app_lab/projects/lvgl-exporter-improvement-v0/`; compact handoff for the next agent: `platform_app_lab/projects/lvgl-exporter-improvement-v0/agent-handoff.md`.
Скилл/команда: `/ucp-web-lvgl-lab`.

Цель: улучшать LVGL Export через измеримый research-first контур, а не расширять генератор вслепую. Текущий baseline — single-screen `ui.c/ui.h` из legacy `uiDesign`; он зафиксирован source notes, compatibility matrix, exact golden-output тестом и отдельной записью в wiki log. Multi-screen baseline реализован как `uiProject` + `genLvglProject()`: UI Designer редактирует экраны, `.ucp` v2 сохраняет `design.uiProject`, старый `design.uiDesign` мигрирует в один `main` screen.

| Уровень | Статус | Что проверить |
|---|---|---|
| L0 Audit | [x] | Текущий `uiDesign` model, `genLvgl()`, UI Designer и LVGL Export описаны в lab audit |
| L1 Compatibility | [x] first pass | Матрица LVGL v8/v9: текущий v8-style baseline сохранён; v9/SquareLine claims отложены до fixtures |
| L2 Model | [x] multi-screen + events/actions + styles + assets + manifest + layout/align/parents | `UiProjectDesign`/`UiScreenDesign`, `uiProject`, `.ucp` migration wrapper, `genLvglProject()`, minimal `UiEvent`, `screen_load` action, `UiStyle`, `Image.assetId`, `UiProjectDesign.assets` manifest (id/src + inline RGB565/RGB565A8 pixels), per-widget `hidden`/`opa`, `Panel.layout` (flow/gap + main/cross/track align), non-Panel `parentId` and per-child `flexGrow` metadata ready; nested/responsive hierarchy pending |
| L3 Golden tests | [x] baseline + events/actions + styles + assets + manifest + layout/align/parents | Exact fixture для текущих `ui.c/ui.h` в `codegen.test.ts`; event, screen-load action, style, image asset, asset-manifest src/missing, inline RGB565/RGB565A8 descriptor, widget hidden/opacity, Panel flex layout, flex main/cross/track align, per-child flex grow and Panel child-parent checks added |
| L4 Slice | [x] state + events/actions + styles + assets + manifest + layout/align/parents | Multi-screen generator/UI state plus minimal clicked/value_changed callback stubs, screen-load controls/export, bgColor/radius controls, Image asset id export, project asset-manifest editor with image import (RGB565/alpha), widget Hidden/Opacity controls, Panel layout + main/cross/track align controls/export, Parent panel controls/export and per-child Grow control/export |
| L5 Promotion | [x] current slices | Подтверждённые single-screen, multi-screen, persistence, minimal-event/action, minimal-style, minimal-asset, asset-manifest, minimal-layout, flex-align and minimal-parent решения перенесены в `modules/codegen.md`, `integration/squareline.md`, roadmap и `log.md` |

## Принципы

- Реальная математика → WASM (+JS-фолбэк +Vitest-вектор); UI поверх общей модели `.ucp`.
- Каждая фича: build чист → Vitest + e2e зелёные → коммит → push.
- Что демо/мок — помечаем; ограничения фиксируем в коммитах.
- **Логи**: после каждого пункта — галочка здесь + запись в [log.md](log.md)
  (что сделано, файлы, тесты, коммит). Дашборд — `/ucp-web-roadmap`.
