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

## ✅ Фаза 7 — полный fab-комплект (done)

1. ✅ **BOM-экспорт CSV** — группировка по value/типу.
2. ✅ **F.Cu/B.Cu Gerber + Excellon drill** — комплект файлов для производства.
3. ✅ **Net-метки / power** (GND/VCC) — связность без проводов; учитываются в Netlist/DRC.
4. ✅ **Поворот компонентов** (R) — символ+выводы+пады, переразводка проводов.

## 🛠 Фаза 8 — «по-настоящему»

- Библиотека компонентов (символы + футпринты) вместо дженериков R/C/U.
- SPICE-симуляция из нетлиста — MNA-решатель в WASM (или ngspice→WASM).
- 3D на three.js — реальный меш, STL/STEP.
- Сделать настоящими мок-модули (Protocol, UI Designer экспорт, CodeGen).

## 🚀 Фаза 9 — амбиции

- Полный WASM-порт десктоп-ядра (`ucp_core`/`ucp_modules`) → web ≡ desktop.
- AI Schematic реально через Claude API (генерация схем).
- Облачные проекты, совместное редактирование, интеграция прошивок.

## Принципы

- Реальная математика → WASM (+JS-фолбэк +Vitest-вектор); UI поверх общей модели `.ucp`.
- Каждая фича: build чист → Vitest + e2e зелёные → коммит → push.
- Что демо/мок — помечаем; ограничения фиксируем в коммитах.
