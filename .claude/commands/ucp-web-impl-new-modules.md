# UCP Web Implement: New Modules (Phase 17)

Phase 17 (`wiki/roadmap-web.md`) — 6 новых модулей. Каждый: запись в
`MODULE_TREE` (`data/modules.ts`) + ветка в `ModuleView` (`modules/index.tsx`) +
`*View.tsx` — процедура в `/ucp-web-module`. Один модуль = один коммит + лог.

## 17.1 Filter Designer 〽️ (под Schematic или отдельно)

- UI: тип (RC low/high-pass, RLC band-pass, Sallen-Key LP), номиналы, fc — поля.
- Математика **переиспользует `acSweep`** из `src/spice.ts`: строить elements
  топологии фильтра программно → Боде |H|/фаза на canvas (как SpiceView).
- Кнопка "→ Schematic": разместить компоненты фильтра в проект.
- Vitest: RC fc=1/(2πRC) → −3дБ в расчётной точке.

## 17.2 Pin Planner 📌

- Выбор MCU из библиотеки (STM32F401, ATmega328P, ESP32) — данные пинов в
  `src/data/pinouts.ts` (имя, альтфункции: GPIO/UART/SPI/I2C/ADC/PWM, питание).
- SVG-корпус с пинами, клик → назначить функцию (конфликты подсветить: одна
  периферия на двух пинах).
- Export C: init-код (HAL для STM32 / `pinMode` Arduino) из назначений.
- Vitest: конфликт детектится; генерация для 2 пинов → ожидаемые строки.

## 17.3 EE Calculators 🧮

- Один модуль с карточками: делитель напряжения (R1/R2/Vin→Vout и обратно),
  резистор LED (Vsupply/Vf/If), ширина дорожки (IPC-2221 формула: I, ΔT, толщина меди),
  теплоотвод LDO (Pd=(Vin−Vout)·I, Tj=Ta+Pd·Rθja).
- Чистые функции в `src/calc.ts` + Vitest-векторы (по 1–2 на калькулятор).

## 17.4 Logic Analyzer 📊 (в Protocol family)

- Импорт VCD (парсер: `$var`, timescale, изменения) и CSV (time,ch0,ch1…).
- Тайминг-диаграмма на canvas: каналы, зум/пан, курсоры Δt.
- Декодеры: UART (по baud), I2C (start/stop/ack/байты), SPI — чистые функции
  `src/logic.ts`, аннотации над диаграммой.
- Vitest: синтетический UART 0x55 @ 9600 → декод 0x55; I2C старт+адрес.

## 17.5 Power Budget ⚡

- Читает `UcpProject`: таблица компонентов с editable полем тока (дефолты по
  kind/value: LED 10mA, MCU 30mA…), группировка по цепям питания (net-метки VCC/3V3/5V).
- Итого по шине, предупреждение при превышении заданного бюджета источника.
- Vitest: проект с 3 компонентами → сумма; перегруз → warning.

## 17.6 Register Map 🗺️ (в CodeGen family)

- Редактор: устройство → регистры (name/addr/access) → битовые поля (name/bits/enum).
- Generate: C-header (`#define REG_X 0x..`, маски/сдвиги полей, static inline
  get/set) + Markdown-таблица. Стор в `design.ts`, генераторы в `codegen.ts`.
- Vitest: 1 регистр/2 поля → корректные маски `(0x3 << 4)` и т.п.

## After each module

`MODULE_COUNT` вырастет — обновить e2e «проход по всем модулям» (он итерирует
дерево — проверить, что новый узел подхватился), tick в roadmap-web, log entry,
`/ucp-web`, отдельный коммит.
