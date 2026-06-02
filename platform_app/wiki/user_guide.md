# User Guide / Руководство пользователя

Практическое руководство по работе с каждым модулем UCP.  
Practical guide to working with each UCP module.

---

## Быстрый старт / Quick Start

### RU
1. Запустить `ucp.exe` (Windows) или `ucp` (Linux/macOS)
2. Дерево модулей — слева; рабочая область — справа
3. **Файл → Новый** (`Ctrl+N`) — создать проект
4. **Файл → Сохранить** (`Ctrl+S`) — сохранить `.ucp`
5. Кликнуть на модуль в дереве — открыть его вкладку

### EN
1. Launch `ucp.exe` (Windows) or `ucp` (Linux/macOS)
2. Module tree — left panel; workspace — right panel
3. **File → New** (`Ctrl+N`) — create project
4. **File → Save** (`Ctrl+S`) — save `.ucp` file
5. Click a module in the tree to open its tab

---

## Редактор схем / Schematic Editor

### RU

**Размещение компонентов:**
- Перетащить компонент из библиотеки (левая панель) на холст
- Двойной клик на компоненте — изменить RefDes и Value
- `R` — повернуть выбранный компонент на 90°
- `Del` — удалить выбранное (вместе с подключёнными проводами)

**Рисование проводов:**
- Нажать кнопку **Wire** на панели инструментов или `W`
- Кликнуть на пин → кликнуть на другой пин
- Провод строится по L-образной трассе

**Метки цепей:**
- Кнопка **Net Label** — разместить именованную цепь (VCC, GND, SDA…)
- Две метки с одинаковым именем логически соединены даже без провода

**Экспорт:**
- **SVG** — кнопка Export на панели → выбрать файл
- **Netlist** — кнопка Generate Netlist → текст в SPICE-формате

**Горячие клавиши:**

| Клавиша | Действие |
|---------|---------|
| `W` | Режим провода |
| `R` | Повернуть компонент |
| `Del` | Удалить выбранное |
| `Ctrl+Z` | Отмена |
| `Ctrl+Y` | Повтор |
| `Ctrl+A` | Выбрать всё |

### EN

**Placing components:**
- Drag a component from the library panel to the canvas
- Double-click a component to edit RefDes and Value
- `R` — rotate selected component 90°
- `Del` — delete selected items (and connected wires)

**Drawing wires:**
- Click **Wire** toolbar button or press `W`
- Click pin → click another pin; wire routes as L-shape

**Net labels:**
- **Net Label** button — place a named net (VCC, GND, SDA…)
- Two labels with the same name are logically connected without a wire

**Export:**
- **SVG** — toolbar Export button
- **Netlist** — Generate Netlist → SPICE-format text

---

## SPICE-симулятор / SPICE Simulator

### RU

1. Открыть **Schematic → SPICE Simulator**
2. Нажать **Generate Netlist** в редакторе схем — netlist передаётся автоматически
3. Выбрать тип анализа:
   - **Transient** — переходный процесс (шаг dt, время окончания)
   - **AC Sweep** — амплитудно-частотная характеристика (точки/декада, Fmin, Fmax)
   - **DC Sweep** — характеристика по постоянному току (источник, Umin, Umax, шаг)
4. Нажать **Run Simulation**
5. Осциллограммы отображаются в нижней части вкладки

> Требует установленного **ngspice** (`ngspice` в PATH).

### EN

1. Open **Schematic → SPICE Simulator**
2. Click **Generate Netlist** in Schematic Editor — netlist is passed automatically
3. Select analysis type: **Transient**, **AC Sweep**, or **DC Sweep**
4. Click **Run Simulation**
5. Waveforms appear in the lower panel

> Requires **ngspice** in PATH.

---

## PCB Layout

### RU

**Размещение footprint:**
- Кнопка **Place Footprint** → выбрать тип из библиотеки (R_0805, DIP8, SOT23 и др.)
- Или: **Import from Schematic** — автоматически разместить все компоненты из netlist в 8-колоночную сетку
- `R` — повернуть footprint, `F` — отразить на B.Cu

**Трассировка:**
- Кнопка **Route Trace** → кликнуть на пад, провести трассу, кликнуть на цель
- Выбрать слой (F.Cu / B.Cu) на панели слоёв
- `V` — разместить переходное отверстие (via)

**Ratsnest:**
- Тонкие пунктирные линии показывают нетрассированные соединения одной цепи

**DRC:**
- Кнопка **DRC** — проверка: зазоры, минимальная ширина трасс, незамкнутые цепи

**Экспорт:**
- **Gerber** — RS-274X для всех 4 слоёв (F.Cu, B.Cu, F.SilkS, Edge.Cuts)

### EN

**Placing footprints:**
- **Place Footprint** button → select from library (R_0805, DIP8, SOT23, etc.)
- Or: **Import from Schematic** — auto-place all netlist components in an 8-column grid
- `R` — rotate, `F` — flip to B.Cu

**Routing:**
- **Route Trace** → click pad, draw trace, click target pad
- Select layer (F.Cu / B.Cu) in the layer panel
- `V` — place via

**DRC:**
- **DRC** button — checks clearance, min trace width, unconnected nets

**Gerber export:**
- **Gerber** button — RS-274X for all 4 layers

---

## 3D-редактор / 3D Editor

### RU

**Навигация:**
- ЛКМ + перетащить — вращение модели
- Колесо мыши — масштаб

**Примитивы:**
- Кнопки **Box / Cylinder / Board / Sphere** — добавить примитив
- Выбрать примитив в списке слева → редактировать позицию и размер в панели справа (X/Y/Z)

**Булевы операции (CSG):**
1. Добавить два примитива
2. Выбрать последние два в списке (они используются как операнды A и B)
3. Нажать одну из кнопок:
   - **A|B Union** — объединение
   - **A-B Subtract** — вычитание A из B
   - **A&B Intersect** — пересечение
4. Результат добавляется как новый объект; исходные примитивы удаляются

**Экспорт:**
- **STL** — бинарный STL для 3D-печати
- **STEP** — ISO-10303-21/AP214 для CAD-систем (FreeCAD, Fusion 360 и др.)

### EN

**Navigation:**
- LMB drag — rotate model
- Mouse wheel — zoom

**Primitives:**
- **Box / Cylinder / Board / Sphere** buttons — add primitive
- Select in list → edit position/size in the right panel

**CSG Boolean ops:**
1. Add two primitives
2. Select the last two in the list (operands A and B)
3. Click: **A|B Union**, **A-B Subtract**, or **A&B Intersect**
4. Result added as new object; originals removed

**Export:**
- **STL** — binary STL for 3D printing
- **STEP** — ISO-10303-21 for CAD (FreeCAD, Fusion 360, etc.)

---

## PID-тюнер / PID Tuner

### RU

1. Открыть **PID Tuner** в дереве модулей
2. По умолчанию создан один канал «Loop 1»
3. Настроить коэффициенты ползунками **Kp / Ki / Kd**
4. График в реальном времени показывает:
   - Setpoint (синий пунктир)
   - Input (зелёный)
   - Output (оранжевый)
   - Скользящее окно 10 с (Qt6::Charts)
5. Кнопка **Auto-Tune** — автоматический подбор по методу Циглера-Николса
6. Кнопка **+ Add Loop** — добавить ещё один ПИД-канал
7. Кнопки **Pause / Resume** — приостановить/возобновить симуляцию

**Вывод в UART-монитор:** при открытом UART-мониторе данные первого канала автоматически передаются через EventBus `pid.tick`.

### EN

1. Open **PID Tuner** in the module tree
2. Default channel «Loop 1» is pre-created
3. Adjust **Kp / Ki / Kd** sliders in real time
4. Rolling chart (10 s window) shows Setpoint / Input / Output
5. **Auto-Tune** — Ziegler-Nichols automatic tuning
6. **+ Add Loop** — add another PID channel
7. **Pause / Resume** — control simulation

---

## Система программ / Program System

### RU

**Готовые программы:** Теплица (3 ПИД), Вентилятор, Стиральная машина.

1. Открыть **Programs** в дереве модулей
2. Выбрать программу из списка
3. Настроить маппинг пинов (Signal → GPIO) в таблице **Pin Mapping**
4. Кнопки **Start / Pause / Stop**
5. Лог выполнения — в нижней части вкладки
6. Кнопка **Export ESP32** — сгенерировать `hal.h + pid_config.h + main.c`

### EN

**Built-in programs:** Greenhouse (3 PID), Fan, Washing Machine.

1. Open **Programs** in module tree
2. Select a program from the list
3. Configure **Pin Mapping** (Signal → GPIO) in the table
4. **Start / Pause / Stop** buttons
5. Execution log in the lower panel
6. **Export ESP32** — generate `hal.h + pid_config.h + main.c`

---

## Дизайнер протоколов / Protocol Designer

### RU

Четыре вкладки:

**1. Sequence Diagram** — диаграмма обмена сообщениями  
- Ввод текста в Mermaid-совместимом формате (participant, ->>, -->>)
- Пресеты: UART 8N1, I2C Write, SPI Full-Duplex, Modbus RTU

**2. Packet Editor** — редактор полей пакета  
- Таблица полей (имя, смещение, ширина, тип)
- Визуализация битовых полей
- Экспорт в C struct с `#pragma pack`

**3. UART Monitor** — монитор последовательного порта  
- Выбор порта и скорости (бод)
- Режимы отображения: ASCII / HEX
- TX: отправить строку или байты

**4. Protocol Analyzer** — декодирование I2C/SPI  
- Вставить hex-дамп → декодировать как I2C (START/ADDR/ACK/DATA/STOP) или SPI (MOSI/MISO пары)
- Пресеты: I2C Read/Write, SPI 8-bit/16-bit

### EN

Four tabs:

**1. Sequence Diagram** — message flow diagram (Mermaid-compatible syntax)

**2. Packet Editor** — packet field table + bit-map visualization + C struct export

**3. UART Monitor** — serial port monitor (ASCII/HEX, TX/RX log)

**4. Protocol Analyzer** — paste hex dump → decode as I2C or SPI

---

## Генератор кода / Code Generator

### RU

Четыре вкладки:

**CRC Calculator:**
- Выбрать алгоритм (12 вариантов: CRC-8, CRC-16/Modbus, CRC-32 и др.)
- Ввести данные (hex или ASCII) → получить контрольную сумму
- Кнопка **Generate C Code** — таблица на 256 элементов + типизированная функция

**LVGL Export:**
- 4 готовых экрана: main_menu, program_select, pin_mapping, monitor
- Кнопка **Export** → выбрать папку → создаются `ui_*.c + ui_*.h + main.c + CMakeLists.txt`

**Arduino Export:**
- Целевая платформа: Arduino (.ino), ESP-IDF (main.c), PlatformIO
- Выбрать программу → сгенерировать полный проект

**Protocol Code Gen:**
- Ввести поля пакета + выбрать CRC → получить `_encode()` / `_decode()` на C

### EN

**CRC Calculator:** 12 algorithms, compute checksum, generate C lookup table.

**LVGL Export:** 4 screens → export complete LVGL v8 project folder.

**Arduino Export:** Arduino / ESP-IDF / PlatformIO complete project generation.

**Protocol Code Gen:** struct + `_encode()` / `_decode()` with CRC.

---

## AI Schematic (Claude API)

### RU

1. Установить переменную окружения с API-ключом до запуска:
   ```powershell
   $env:UCP_CLAUDE_KEY = "sk-ant-..."
   ```
2. Открыть **AI Schematic** в дереве (дочерний модуль Schematic Editor)
3. Ввести описание схемы на естественном языке, например:
   > «Мигающий светодиод на 555 таймере, частота 1 Гц»
4. Нажать **Generate**
5. Через несколько секунд компоненты и соединения появятся на схеме

> Требует подключения к интернету и валидного ключа Claude API.  
> Без ключа — модуль отображает статус «No API key».

### EN

1. Set env var before launch: `$env:UCP_CLAUDE_KEY = "sk-ant-..."`
2. Open **AI Schematic** (child of Schematic Editor)
3. Enter a natural-language description, e.g.:
   > "555 timer astable multivibrator with LED, 1 Hz"
4. Click **Generate**
5. Components and wires appear on the schematic in seconds

> Requires internet and a valid Claude API key (`UCP_CLAUDE_KEY` env var).

---

## OTA Flash (ESP32)

### RU

1. Подключить ESP32 по USB
2. Открыть **OTA Flash** в дереве модулей
3. Выбрать COM-порт из выпадающего списка (кнопка **Refresh** для обновления)
4. Нажать **Browse** → выбрать `.bin` файл прошивки
5. При необходимости изменить адрес прошивки (по умолчанию `0x0`)
6. Нажать **Flash**
7. Прогресс отображается в строке прогресса и лог-окне

> Требует Python 3 в PATH: `pip install esptool`

### EN

1. Connect ESP32 via USB
2. Open **OTA Flash** in the module tree
3. Select COM port (click **Refresh** to rescan)
4. **Browse** → select `.bin` firmware file
5. Set flash address if needed (default `0x0`)
6. Click **Flash**
7. Progress bar + log window show status

> Requires Python 3 in PATH: `pip install esptool`

---

## Горячие клавиши / Keyboard Shortcuts

| Клавиша / Key | Действие / Action |
|---------------|------------------|
| `Ctrl+N` | Новый проект / New project |
| `Ctrl+O` | Открыть / Open |
| `Ctrl+S` | Сохранить / Save |
| `Ctrl+Z` | Отмена / Undo |
| `Ctrl+Y` | Повтор / Redo |
| `Ctrl+\` | Показать/скрыть дерево модулей / Toggle module tree |
| `Ctrl+/` | Справка по горячим клавишам / Shortcuts dialog |
| `F1` | Встроенная справка Qt Help / Built-in Qt Help |
| `W` | Режим провода (схема) / Wire mode (schematic) |
| `R` | Повернуть / Rotate |
| `F` | Отразить (PCB) / Flip (PCB) |
| `Del` | Удалить / Delete |

---

## Темы / Themes

**View → Dark Theme** (по умолчанию) / **View → Light Theme**

---

## Автосохранение / Autosave

Проект автоматически сохраняется каждые 5 минут в `<имя>.ucp.bak`.  
Project auto-saves every 5 minutes to `<name>.ucp.bak`.
