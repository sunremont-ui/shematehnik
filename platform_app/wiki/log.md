# Log

Chronological record of wiki evolution.

---

## [2026-06-11] feature | Web — фаза 10.1–10.3: Web Serial (UART Monitor + PID live)

- **`src/serial.ts`** — общий слой Web Serial: один порт на приложение, стор `useSerial()` (supported/status/info/baud), `serialOpen/serialClose/serialWrite/onSerialData` (несколько подписчиков), read-loop по chromium-паттерну (восстановимые ошибки → новый reader; отключение устройства → closed)
- Чистые помощники: `LineBuffer` (сборка строк из чанков, рвёт CRLF/LF/CR и UTF-8 посреди символа), `parseTelemetry` («T:26.1 S:60 O:128» — формат debug-печати прошивок), `formatBytes`
- **UART Monitor** — реальный порт (Connect, baud 9600…921600, hex/ascii, TX-строка с \r\n) + симуляция как явный режим (кнопка Simulate, чип «симуляция»)
- **PID Tuner** — переключатель Sim|Live: live читает телеметрию с устройства (график T + SP из потока), отправка уставки `S=<v>\n`; sim-режим не тронут
- Тесты: Vitest 59 (`serial.test.ts` — 9: LineBuffer/parseTelemetry/formatBytes), Playwright 8 (+UART sim-фолбэк, +PID Sim/Live); build чист (779 КБ)
- Ручная проверка с железом (STM32/ESP32 по USB-UART) — за пользователем: Chrome → Connect → выбрать порт

## [2026-06-11] plan | Web Frontend — roadmap цикл 2 (фазы 10–17) + скиллы

- Исследование границы «реальное/мок»: мок остались UART Monitor, OTA, AI, Programs, Analyzer, Firmware/Agent; SPICE только линейный (R/C/L); PCB-DRC без зазоров
- [roadmap-web.md](roadmap-web.md): добавлены фазы 10–17 — Web Serial (UART/PID live/esptool-js OTA), SPICE 2.0 (диод/BJT/MOSFET, Ньютон-Рафсон), PCB Pro (clearance-DRC, ручные дорожки, pour, P&P), Schematic UX, библиотека (custom parts, `.kicad_sym`), кросс-модули (FSM-генератор, Analyzer по `design.ts`, AI опц.), гигиена (`.ucp` v2, code-split three, PWA), 6 новых модулей
- Новые скиллы `/ucp-web-impl-*` (по одному на пункт/группу) + дашборд `/ucp-web-roadmap`; обновлены `/ucp-web`, [skills.md](skills.md)
- Конвенция логов: после каждого пункта — галочка в roadmap-web + запись сюда (файлы, тесты, коммит)

## [2026-06-10] feature | Web — фаза 8.3–8.5: реальный SPICE, three.js, генераторы

- **SPICE по топологии** (`src/spice.ts`): узлы из проводов+меток (`buildNodes`), номиналы `parseValue` (10k/100n), режимы DC/TRAN (backward-Euler companion C/L)/AC (комплексный MNA → Боде); панель выбора source/ground/probe; экспорт `.cir`
- **3D на three.js** (`src/three/`): WebGL-меш платы + OrbitControls, экспорт бинарный STL + STEP AP214; Part Editor рендерит CSG тем же вьюпортом; deps `three@0.184`
- **Настоящие генераторы** (`src/codegen.ts` + общий стор `src/design.ts`): LVGL ui.c/ui.h из виджетов, C-struct/парсер пакета (C/Python, CRC), параметрический Arduino/ESP-IDF; Sequence → PNG
- Тесты: Vitest 50 (spice/codegen/exporters), Playwright 6; обновлён [Web Frontend](modules/web_frontend.md)

## [2026-06-10] update | Web Frontend — A* routing, layers, KiCad import

- Роутер `src/routing.ts`: A* по сетке с объездом препятствий (`routeOrthogonal`/`routeOrthogonalEx`) — общий для Schematic (объезд корпусов) и PCB (объезд футпринтов)
- PCB: последовательная разводка (уложенные дорожки = препятствия) + **двухслойная** F.Cu/B.Cu с переходными отверстиями; Schematic-провода и ERC-подсветка висящих выводов
- Импорт `.kicad_sch`: компоненты с раскладкой + цепи по геометрии (`lib_symbols` × трансформация инстанса → union-find проводов); + `.net` (полный)
- Обновлены [Web Frontend](modules/web_frontend.md), скилл `/ucp-web-route` (PCB на A*); новые скиллы `/ucp-web-route`, `/ucp-web-module`, `/git`
- Тесты: 29 Vitest + 2 Playwright; коммиты `0c608a0`→`d7776ed`

## [2026-06-10] update | Web Frontend — WASM core, shared model, tests/CI/deploy

- Веб-фронтенд доведён с мок-демо до прод-готовности; обновлена [Web Frontend](modules/web_frontend.md)
- **WASM-ядро** (`wasm/`, Emscripten+embind): `crc`, `pidStep`, `rcLowpass`, `connectedComponents`, `csg` (BSP) — с JS-фолбэком, бейдж `engine: wasm|js`; артефакты в `public/wasm/`
- **Общая модель** `UcpProject{components, wires}` (`.ucp`): Schematic правит (multi-pin U=6, рисование проводов), Netlist/PCB/3D читают; DRC, экспорт нетлиста (`.net`) и Gerber (RS-274X)
- undo/redo (Edit-меню, коалесинг), File Save/Open, автосейв localStorage, keep-alive вкладок
- Vitest (21) + Playwright (2), CI-джоба `web`, деплой на GitHub Pages (`deploy-web.yml`)
- Скилл `/ucp-web` обновлён (test/test:e2e/build:wasm)

## [2026-06-02] add | Web Frontend (React+TS+Vite)

- Новая веб-версия UI: порт Qt6 десктоп-оболочки на React 18 + TypeScript (strict) + Vite 5, в `platform_app/web/`
- Оболочка 1:1: MenuBar/ModuleTree/Workspace/StatusBar + GitHub-dark тема из `applyTheme("dark")`; состояние через `UcpContext` (замена EventBus+Project); `MODULE_TREE` повторяет `ModuleFactory`
- Все 25 модулей реализованы интерактивно (мок-данные): Schematic/SPICE/PCB/3D/PID/Protocol/CodeGen/UI Designer/AI/OTA/Firmware/Agent
- Проверено браузером: 0 JS-ошибок, CRC-32("123456789")=0xCBF43926, `npm run build` чист
- Добавлены: [Web Frontend](modules/web_frontend.md), запись в [skills.md](skills.md) (`/ucp-web`), первый коммит репо `8f7e60e`

## [2026-05-17] improve | Soldering Iron — session-02 (6 улучшений)

- **TIM4 pulse**: убран DWT busy-wait из ISR нагревателя → двухступенчатый ISR TIM3→TIM4→PA8
- **sin² коррекция**: `triac_correction[101]` — линеаризация реальной мощности симистора
- **Debounce кнопки**: `btn_debounce_polls` счётчик, подтверждение через 3 опроса (15мс)
- **EMA фильтр**: Q8 fixed-point, α=51/256≈0.2 — давит помехи симистора на ADC
- **Standby**: таймер 10мин бездействия → stop heater + экран STANDBY, любой ввод → wake
- **Flash storage**: `core/flash_storage.h/.c` — magic 0xDEADBEEF + HAL_FLASH сектор 7
- обновлены: `heater_driver`, `heater_module`, `encoder_driver`, `temp_module`, `display_module`, `menu_renderer`, `app.h/.c`, `main.c`, `CMakeLists.txt`

## [2026-05-17] add | STM32 Firmware Architecture concept

- создано: `concepts/stm32-firmware-architecture.md` — шаблон для всех будущих embedded-устройств
- содержит: структуру папок, EventBus C-версию, App tick шаблон, FSM меню, таблицу периферии, Flash storage, Standby, CMakeLists шаблон, чеклист нового устройства

## [2026-05-17] add | Soldering Iron Firmware

- создано: `modules/soldering_iron_firmware.md`
- описание firmware паяльника на STM32F401CCU6: DisplayModule (SSD1306), EncoderModule (TIM2), TempSensorModule (ADC+NTC), HeaterModule (симистор, фазовый сдвиг), RegulatorModule (P-регулятор), EventBus, App FSM
- обновлено: `index.md` — добавлена строка в секцию Modules

---

## [2026-05-17] feature | v2.0 COMPLETE — CSG, STEP, AI Schematic, OTA Flash, WASM

### v1.3 — 3D Boolean Ops (CSG) + STEP Export

- **BSP-tree CSG** (`modules/threed/threed_module.h/.cpp`): full `csgUnion / csgSubtract / csgIntersect` using `CsgMesh = QVector<CsgTriangle>`, no external library
  - `CsgNode`: `build()`, `clip()`, `clipTo()`, `invert()`, `allTriangles()` — standard BSP algorithm
  - `splitTriangle()`: plane-clips triangle with fan triangulation for polygon pieces
  - `primitiveToMesh()`: tessellates any `ThreeDPrimitive` (Box/Cylinder/Board/Sphere) to `CsgMesh`
  - `CsgResultPrimitive`: stores result mesh, implements `buildVertices()` / `exportSTLTriangles()`
  - Toolbar buttons in `PartEditorModule`: "A|B Union", "A-B Subtract", "A&B Intersect"
- **STEP export** (`StepWriter::meshToStep()`): ISO-10303-21/AP214 with `COORDINATES_LIST` + `TRIANGULATED_FACE_SET` — no OpenCASCADE
  - "STEP" toolbar button in PartEditorModule; `ThreeDView::exportSTEP()`
- Integration tests: 4 CSG tests + 3 STEP tests added to `test_integration.cpp`

### v2.0 — AI Schematic

- New module `modules/ai/ai_schematic_module.h/.cpp`:
  - `REGISTER_MODULE(AiSchematicModule)` — smoke-tested
  - POST to `https://api.anthropic.com/v1/messages` (model `claude-sonnet-4-6`) via `QNetworkAccessManager`
  - API key from `UCP_CLAUDE_KEY` env; graceful fallback if missing or no network
  - `applySchematic()`: strips ```json fences, parses `{components, connections}`, emits `EventBus::instance().emitEvent("ai.schematic.ready", ...)`
  - Guard: `#ifdef HAS_QT_NETWORK`
- `SchematicModule::onAiSchematic()`: subscribes to `ai.schematic.ready`, places components in 8-col grid (120×100px), draws wires
- `CMakeLists.txt`: `find_package(Qt6 COMPONENTS Network QUIET)` → `HAS_QT_NETWORK` + `Qt6::Network` link
- Integration tests: 4 AI tests (valid JSON, markdown strip, empty, event emitted via `AiEventReceiver` helper)

### v2.0 — OTA Flash

- New module `modules/ota/ota_flash_module.h/.cpp`:
  - `REGISTER_MODULE(OtaFlashModule)`
  - `buildArgs()`: returns `{"-m","esptool","--port",...,"write_flash","--flash_mode","dio",...}`
  - `parseProgressLine()`: `static QRegularExpression(R"(\(\s*(\d+)\s*%\))")` → int or -1
  - Port list: `QSerialPortInfo::availablePorts()` under `#ifdef HAS_QT_SERIALPORT`, else COM1–3 fallback
  - `onFlash()`: spawns `python` process, streams stdout/stderr to log, `QProgressBar` via `parseProgressLine()`
- Integration tests: 6 OTA tests (widget, buildArgs port/addr/defaults, parseProgressLine normal/empty/boundary)

### v2.0 — WASM

- `cmake/wasm.cmake`: Emscripten toolchain (`emcc`/`em++`/`emar`), reads `$ENV{EMSDK}` + `QT_WASM_ROOT`, sets `CMAKE_EXECUTABLE_SUFFIX ".html"`, Qt WASM linker flags
- `UCP_WASM` CMake flag: OTA Flash excluded via `$<$<NOT:$<BOOL:${UCP_WASM}>>:...>`, `add_compile_definitions(Q_OS_WASM)`
- `spice_module.h/.cpp`: `#ifndef Q_OS_WASM` guards on `#include <QProcess>`, slot declarations, `m_process` member, `runSimulation()` early return
- `.github/workflows/ci.yml`: `wasm` job — emsdk 3.1.50 + aqtinstall Qt 6.6.0 wasm_singlethread, `continue-on-error: true`, artifact upload (ucp.html/wasm/js)

### Test suite update

| Suite | Tests | Status |
|-------|-------|--------|
| CoreTests | 8 | PASS |
| SmokeTests | 64 (22 module types) | PASS |
| IntegrationTests | 36 | PASS |

### Documentation + skills updated

- `wiki/roadmap.md`: v1.3 + v2.0 all items ✓ DONE
- `memory/project_ucp.md`: rewritten for v2.0.0 (22 modules, full key patterns)
- New skills: `/ucp-impl-ai-schematic`, `/ucp-impl-ota-flash`, `/ucp-impl-wasm`
- `wiki/skills.md`: v1.1–v1.3 all marked DONE, v2.0 section added
- `wiki/index.md`: AI Schematic + OTA Flash module pages added
- New wiki pages: `wiki/modules/ai_schematic.md`, `wiki/modules/ota_flash.md`

---

## [2026-05-17] feature | v1.0 — Wire serialization + EventBus off() + 19 integration tests

### Wire serialization (`schematic_module.cpp`)
- `SchematicScene::serialize()`: wires now encoded as `{from:{refdes,pin}, to:{refdes,pin}}` instead of empty `{}`
- `SchematicScene::deserialize()`: restores wires via `QHash<refdes→comp>` lookup after components loaded; no undo-stack pollution
- New integration test `schematic_wire_roundtrip`: serialize R1–C1 scene, deserialize into new scene, verify 1 wire + correct pin connections

### EventBus unsubscribe (`event_bus.h/cpp`, `module.cpp`)
- `EventBus::on()` now stores each `QMetaObject::Connection` in `QMultiHash<QObject*, Connection> m_connections`
- First `on()` call for a receiver registers auto-cleanup on `QObject::destroyed`
- `EventBus::off(QObject*)` disconnects and removes all connections for that receiver
- `Module::destroy()` calls `EventBus::instance().off(this)` — eliminates dangling lambda callbacks

### v1.0 roadmap
- Wire serialization ✓, EventBus off ✓, Project save/load UI ✓ (was already implemented)
- Remaining: stable IModule API, Qt Help docs, package managers
- Total integration tests: 19 (was 18)

### Wiki/skill updates
- `architecture/event_bus.md`: added off() documentation
- `modules/schematic_editor.md`: added wire serialization + refdes counter sections
- `.claude/commands/ucp-impl-wire-serial.md`: marked DONE
- `.claude/commands/ucp-impl-eventbus-unsub.md`: marked DONE
- `.claude/commands/ucp-impl-project-save.md`: marked DONE

---

## [2026-05-17] testing | Integration tests + critical bug fixes + improvement vectors

### Integration test suite (`tests/test_integration.cpp`) — 14 tests
- CRC-32 known vector ("123456789" → 0xCBF43926) ✓
- CRC-16/MODBUS known vector (0x4B37) ✓  
- CRC C-code generation non-empty ✓
- PID: proportional, clamp high/low, disabled=0, Z-N autotune, integral accumulation ✓
- Schematic: add component, refdes counter, serialize→deserialize roundtrip ✓
- PCB: DRC on empty scene passes, placeFootprint non-null with pads ✓

### Critical production bugs found and fixed

**Bug 1 — SchematicScene: components never visible after placement**  
`addComponent()` created SchematicComponent but did NOT call `addItem()` before pushing to QUndoStack. `AddComponentCmd::redo()` has `m_first=true` which skips the initial `addItem`. Result: placed components were invisible on screen.  
Fix: call `addItem(comp)` before `push()` in `addComponent()`. Same fix applied to `addWire()` + pre-connected pins.

**Bug 2 — PidTunerModule: null crash on init**  
`init()` called `addChannel()` which accessed `m_channelSelector` (null before `widget()`).  
Fix: null-guard in `addChannel()` + repopulate from children in `widget()`.

**Bug 3 — QString::arg format string**  
`"#define PIN_%-20s"` is printf syntax, not Qt. Fixed: `leftJustified(20)`.

### Improvement vectors added to roadmap (Tier 1–4, 15 items)

---

## [2026-05-17] testing | Smoke tests + bug fixes + module documentation

### Smoke test suite (`tests/test_smoke.cpp`)
- 62 test cases across 3 groups: factory_all_types, module_init, module_widget
- All 20 registered module types covered
- `tests/CMakeLists.txt` updated: `ucp_smoke_tests` target with `--whole-archive` + `QT_QPA_PLATFORM=offscreen`
- Run: `QT_QPA_PLATFORM=offscreen ctest` — 100% pass

### Bugs found and fixed
- **PidTunerModule**: `addChannel()` called from `init()` accessed `m_channelSelector`/`m_channelContainer` before `widget()` — null ptr crash. Fixed: null-guard + repopulate in `widget()`
- **ArduinoExportModule / CodeGenModule**: `"#define PIN_%-20s"` printf format inside `QString::arg()` — 5 runtime warnings. Fixed: `leftJustified(20)` 

### New wiki pages (5 modules previously undocumented)
- `wiki/modules/spice.md` — ngspice integration, raw-file parser, WaveformWidget
- `wiki/modules/pcb.md` — layers, footprints, DRC, Gerber export, keyboard shortcuts
- `wiki/modules/threed.md` — QPainter renderer, primitives, STL export
- `wiki/modules/protocol.md` — sequence diagrams, packet editor, UART monitor, protocol analyzer
- `wiki/modules/codegen.md` — CRC, LVGL, Arduino/ESP-IDF, protocol code gen

### Roadmap
- Added Improvement Vectors section (Tier 1–4) with 15 specific actionable items
- Smoke tests item marked done in v0.9

---

## [2026-05-17] meta | Memory system, skills page, wiki index updated

- Created Claude Code memory system: `~/.claude/projects/d--shemaTehnik/memory/`
  - `MEMORY.md` — index
  - `project_ucp.md` — UCP architecture + roadmap status snapshot
  - `project_mcu_wiki.md` — wikiMemory Obsidian vault overview
  - `user_profile.md` — user domain, language, communication style
  - `feedback_style.md` — confirmed coding rules (CMake 3.20, no comments, no trailing summaries)
  - `skills_commands.md` — all available slash commands with triggers and descriptions
- Created `wiki/skills.md` — slash command reference for this project (RU)
- Updated `wiki/index.md` — added link to skills.md

---

## [2026-05-17] feature | v0.4/v0.7/v0.8/v0.9 optional items + infrastructure complete

### PCB Auto-placement from Netlist (v0.4 remaining)
- `PcbModule::onNetlistReceived(const QVariant &)`: EventBus subscriber for `netlist.generated`
- `importFromNetlist(const QString &)`: static typeToFp map (R→R_0805, C→C_0805, U→DIP8, etc.)
- Parses netlist component lines, places footprints in 8-column grid (40mm spacing)
- "Import from Schematic" toolbar button triggers placement from stored `m_lastNetlist`
- Files: pcb_module.h/.cpp extended (~40 new lines)

### I2C/SPI Protocol Analyzer (v0.7 remaining)
- `ProtocolAnalyzerModule`: new child of ProtocolModule
- `parseHexInput()`: regex split on whitespace/comma/0x-prefix, returns `QVector<uint8_t>`
- `decodeI2C()`: START → ADDRESS (7-bit + R/W) → ACK/NAK → DATA bytes → STOP; addRow() populates QTableWidget
- `decodeSPI()`: byte pairs as MOSI/MISO columns, auto-detects odd input length
- 4 presets: I2C Read, I2C Write, SPI 8-bit, SPI 16-bit (hex input examples)
- Files: protocol_module.h/.cpp extended (~130 new lines)

### Protocol Code Generator (v0.8 remaining)
- `ProtocolCodeGenModule`: new child of CodeGenModule
- `widget()`: packet name field, CRC algorithm selector (all 12 from CrcEngine), "Append CRC" checkbox
- Fields QTableWidget: Name/Type/Description columns; default Modbus-style fields (addr, func, data, crc)
- `generateCode()`: `#pragma pack(push,1)` struct + `_encode()` (memcpy + CRC compute + append) + `_decode()` (length check + CRC verify + memcpy)
- `exportFiles()`: writes `<name>.h` with header guards + `crc.c` from `CrcEngine::generateCCode()`
- CRC identifier: `alg.name.toLower().remove('/').remove('-')` → valid C identifier
- Files: codegen_module.h/.cpp extended (~140 new lines)

### CLI & Multilingual (v0.9 remaining)
- `main.cpp` rewritten: QCommandLineParser with `--build <project.ucp>` + `--lang <en|ru>`
- `runHeadlessBuild()`: opens JSON, prints name/version/module count, returns 0
- `QTranslator`: loads `qt_<lang>` from Qt translations path + `ucp_<lang>` from `:/translations`
- Language auto-detected from `QLocale::system().name().left(2)`; `--lang` overrides
- Files: `translations/ucp_ru.ts` (95 strings across 6 contexts), `translations/ucp_en.ts` (identity translations)

### Unit Tests (v0.9 remaining)
- `tests/test_core.cpp`: `StubModule` concrete subclass with `eventCount` + `onEvent()`
- 8 test slots: `module_name`, `module_id_unique`, `module_parent_child`, `module_find_child`, `module_serialize_roundtrip`, `eventbus_emit_receive`, `eventbus_multiple_receivers`, `eventbus_no_crossfire`
- All EventBus tests call `QCoreApplication::processEvents()` before asserting count
- `tests/CMakeLists.txt`: `find_package(Qt6 REQUIRED COMPONENTS Test)`, links `ucp_core`

### Infrastructure
- CMakeLists.txt: `qt_add_translations()` for ucp_ru.ts + ucp_en.ts; `enable_testing()` + `add_subdirectory(tests)`
- `translations/` directory: placeholder ucp_ru.ts + ucp_en.ts (Qt Linguist XML format)
- wiki/roadmap.md: auto-placement, protocol analyzer, protocol codegen, CLI, multilingual, unit tests marked DONE
- Total new code: ~310 new lines C++17 + ~240 lines XML translations, project total ~8000+ lines

---

## [2026-05-16] feature | v0.2/v0.3/v0.4/v0.7 optional items complete

### Symbol Editor (v0.2 remaining)
- `SymbolScene`: QGraphicsScene with dot grid (10px), center axes, 5 drawing tools
- Tools: Select, Line, Rect, Circle, Text (QInputDialog on click)
- Del/Esc key handling; item select + delete
- Serialize/deserialize all drawn items to/from JSON
- `SymbolEditor::widget()`: name + description fields, toolbar, QGraphicsView
- Pin table (QTableWidget: Name/X/Y/Dir) with Add/Remove buttons
- Pin markers auto-refreshed on table change (tagged with `setData(99)`)
- Save/Load JSON via QFileDialog
- Files: schematic_module.h/.cpp extended (~160 new lines)

### SPICE Analysis Selector (v0.3 remaining)
- `SpiceAnalysis` enum: Tran / AC / DcSweep
- UI: QGroupBox with QComboBox + QStackedWidget (3 param pages)
- Tran page: Step (ms) + Stop (ms) with QDoubleSpinBox
- AC page: Points/decade, Fstart, Fstop
- DC Sweep page: Source name, Start/Stop/Step voltages
- `runSimulation()`: strips existing analysis line, injects selected analysis before `.end`
- Files: spice_module.h/.cpp extended (~80 new lines)

### PCB Undo/Redo (v0.4 remaining)
- `AddPcbTraceCmd`, `AddPcbViaCmd`, `AddPcbFootprintCmd`: `m_first`/`m_owned` pattern
- `PcbScene::m_undoStack` initialized in constructor; board outline added directly (not in stack)
- `addTrace()`, `addVia()`, `placeFootprint()` each push to undo stack after `addItem()`
- Undo/Redo toolbar actions added to PcbModule widget
- Files: pcb_module.h/.cpp extended (~70 new lines)

### UART Monitor (v0.7 remaining)
- `UartMonitorModule`: new child of ProtocolModule
- UI: Port combo (Scan button), Baud, Format (8N1/8N2/7E1/7O1), Connect toggle
- RX log: colored timestamp (hh:mm:ss.zzz), RX=green / TX=blue, HTML-safe
- Hex mode toggle; Clear button; Enter key sends
- HAS_QT_SERIALPORT guard: real QSerialPort when Qt6::SerialPort linked
- Demo mode: COM1–9 listed, data echoed locally
- CMakeLists.txt: `find_package(Qt6 OPTIONAL_COMPONENTS SerialPort)`; conditional link + define
- Files: protocol_module.h/.cpp extended (~160 new lines)

### Infrastructure
- CMakeLists.txt: version bumped to 0.9.1
- modules_init.h: added UartMonitorModule force-link
- wiki/roadmap.md: Symbol Editor, Analysis Selector, PCB Undo/Redo, UART Monitor marked DONE
- Total new code: ~470 lines C++17, project total ~7500+ lines

---

## [2026-05-16] init | Project kickoff

- Created wiki structure: AGENTS.md, index.md, log.md
- Created: overview.md, philosophy.md, roadmap.md
- Created: architecture/module_system.md, architecture/event_bus.md
- Created: modules/schematic_editor.md, modules/program_system.md
- Created: concepts/hal.md, concepts/pin_mapping.md
- Initial code written: core (module, factory, event bus, project), schematic module example, main window

## [2026-05-16] feature | SchematicEditor — full QGraphicsScene implementation

- SchematicComponent: 7 component types (R, C, D, NPN, PNP, GND, V) with pins
- SchematicPin: connection points, wire tracking
- SchematicWire: auto-orthogonal routing, pin-to-pin connection
- SchematicScene: wire mode with rubber band preview
- ComponentLibrary: dock widget with component list
- WireTool sub-module: routing options (orthogonal toggle)
- NetlistModule sub-module: stub with QTextEdit output
- SPICEModule sub-module: stub (ready for ngspice)
- Totals: 856 lines (243 header + 613 implementation)
- Updated roadmap: ~80% of v0.2 done

## [2026-05-16] feature | SPICE simulation + full NetlistGenerator

- NetlistGenerator: DFS-based net tracing (adjacency graph → net numbers)
- Supports R, C, D, NPN, PNP, V, GND SPICE output
- Default analysis: .tran 1m 100m (or .ac if AC source detected)
- SPICEModule: ngspice subprocess integration (ngspice -b)
- SPICE3 raw format parser (header + tab-separated values)
- WaveformWidget: QPainter graph with grid, legend, cursor tooltip
- Multi-signal: up to 9 signals with distinct colors
- Component values: defaults (R=1k, C=100n, V=5V...), serialized in JSON
- New file: spice_module.h/.cpp (518 lines)
- Updated schematic_module.h/.cpp: value field, constructor defaults
- Totals: ~2000 lines C++17 across project

## [2026-05-16] feature | v0.6 3D Editor + v0.8 Code Generator + v0.9 Polish

### 3D Editor (v0.6) — no OpenCASCADE dependency
- ThreeDView: QPainter isometric renderer with painter's algorithm face sorting
- Rotation: LMB drag (X+Y axes), zoom: mouse wheel. Range: rotX [-89°,89°], zoom [0.3–20×]
- BoxPrimitive: 6 quads, each split to 2 triangles for STL
- CylinderPrimitive: N=16 segments, 2 caps + 16 side quads
- BoardPrimitive: flat box with green top face (PCB texture)
- Directional light shading: dot(normal, light_dir) → brightness multiplier
- PrimitivePropsPanel: QDoubleSpinBox for Pos XYZ and Size XYZ, live update
- Binary STL export: 80-byte header, per-triangle normals, correct endianness
- Object list with type icons (□ ⊙ ▬), selection sync list↔view
- Default scene: board + IC housing + capacitor (demo scene)
- Files: threed_module.h, threed_module.cpp (~550 lines)

### Code Generator (v0.8)
- CrcCalculatorModule: 12 algorithms (CRC-8, CRC-8/Dallas-Maxim, CRC-16/CCITT,
  CRC-16/Modbus, CRC-16/ARC, CRC-16/XMODEM, CRC-32, CRC-32C, etc.)
- CRC: real table-driven computation with refIn/refOut/xorOut parameters
- CRC C code generator: 256-entry lookup table + typed function (uint8/16/32_t)
- LvglExportModule: 4 screens (main_menu, program_select, pin_mapping, monitor)
  - Generates LVGL v8.x compatible C/H code with lv_obj_t, lv_label, lv_btn, etc.
  - Export to folder: ui_*.c + ui_*.h + main.c + CMakeLists.txt
- ArduinoExportModule: 3 targets (Arduino .ino, ESP-IDF main.c, PlatformIO)
  - Pre-built pin maps for Greenhouse, Fan, Washing Machine programs
  - Exports full files with #define PIN_ and setup()/loop() or app_main()
- Files: codegen_module.h, codegen_module.cpp (~500 lines)

### v0.9 Polish — MainWindow overhaul
- Dark theme: full QPalette + 400-char QSS (QToolBar, QMenu, QTreeWidget,
  QTabBar, QPushButton, QComboBox, QSpinBox, QScrollBar, QSplitter, QGroupBox)
- Light theme toggle via View menu with QActionGroup (exclusive)
- Status bar: 3 zones (left=status, center=module name, right=version)
- EventBus "status.message" → QLabel with 5s auto-clear timer
- About dialog: HTML with module list, version, tech stack
- Shortcuts dialog (Ctrl+/): all keyboard shortcuts in HTML table
- Module tree toggle (Ctrl+\), animated tree expansion
- Window title: "ModuleName — ProjectName *" (modified indicator)
- Files: main_window.h, main_window.cpp rewritten (~220 lines)

### Infrastructure
- CMakeLists.txt: v0.8.0, added threed/, codegen/ sources
- modules_init.h: ThreeDModule, CodeGenModule force-linked
- wiki/roadmap.md: v0.6, v0.8, v0.9 marked DONE
- Total session: ~1900 new lines, project total ~7000+ lines C++17

## [2026-05-16] feature | v0.2 complete + v0.4 PCB Layout + v0.7 Protocol Designer

### Schematic Editor (v0.2 complete)
- Undo/Redo via QUndoStack: AddComponentCmd, AddWireCmd, DeleteItemsCmd, MoveComponentCmd
- Value Editor: double-click on component → QDialog for RefDes + Value
- SVG Export: QSvgGenerator export via toolbar button
- Delete key (Del/Backspace) removes selected items + connected wires
- Voltage source now has a proper circle symbol with +/- labels
- Files: schematic_module.h/.cpp fully rewritten (~600 lines)

### PCB Layout (v0.4)
- PcbPad: SMD and through-hole pads with net assignment
- PcbTrace: copper trace with layer + width, QPainter rendering
- PcbVia: through-hole via connecting F.Cu to B.Cu
- PcbFootprint: group of pads + silkscreen lines + courtyard boundary
- FootprintLibrary (singleton): 8 built-in footprints (R_0805, C_0402, C_0805, DIP8, DIP14, SOT23, TO92, Conn_01x02)
- PcbScene: 4 layers (F.Cu/B.Cu/F.SilkS/Edge.Cuts), trace routing mode, grid snap 0.25mm
- Layer visibility toggle per layer
- DRC: basic clearance check between traces and pads of different nets
- Gerber Export: RS-274X format for all 4 layers (apertures + flashes + draws)
- Files: pcb_module.h, pcb_module.cpp (~650 lines)

### Protocol Designer (v0.7)
- SeqDiagram parser: Mermaid-compatible (participant, ->>, -->, -->>; note over; title)
- SequenceDiagramWidget: pure QPainter renderer — boxes, lifelines, sync/async/reply arrows, notes
- 4 presets: UART 8N1, I2C Write, SPI Full-Duplex, Modbus RTU
- PacketEditorModule: QTableWidget (name/offset/width/type/desc) with live update
- PacketBitMapWidget: colored bit-field visualization (8 colors, bit labels)
- C struct export: #pragma pack(push,1) struct with bit-fields and comments
- 3 packet presets: UART 8N1 frame, Modbus RTU, 32-bit control register
- Files: protocol_module.h, protocol_module.cpp (~580 lines)

### Infrastructure
- CMakeLists.txt: added Qt6::Svg, pcb_module.cpp, protocol_module.cpp
- modules_init.h: force-link PcbModule, ProtocolModule
- wiki/roadmap.md: marked v0.2, v0.4, v0.7 as DONE
- Total new code: ~1830 lines C++17, project total ~5000+ lines

## [2026-05-16] feature | PID + Program System (v0.5)

### PID System
- PidCore: clean C++ PID algorithm (P+I+D, anti-windup clamping, Ziegler-Nichols autotune)
- PidChannel: single PID loop with Kp/Ki/Kd sliders, real-time PidGraphWidget
- PidTunerModule: multi-channel PID manager (add/stop/resume loops)
- Files: pid_core.h/.cpp, pid_tuner_module.h/.cpp (254 lines)

### Program System
- ProgramBase: abstract base with 5 states (IDLE/RUNNING/PAUSED/ERROR/COMPLETED)
- ProgramRegistry: factory with REGISTER_PROGRAM macro
- PinMappingWidget: table editor for Signal→GPIO assignment
- ProgramSystemModule: UI with program list, controls, pin mapping, log
- Files: program_core.h/.cpp, pin_mapping_widget.h/.cpp, program_system_module.h/.cpp (394 lines)

### Ready-made programs
- Greenhouse: 3 PID loops (temp/humidity/light), day/night cycle, 9 pins
- Fan: temperature→RPM curve, timer modes, 6 pins
- Washing Machine: 5 cycle types, PID motor+heater, 12 pins, 120min schedule
- Files: greenhouse_prog.h/.cpp, fan_prog.h/.cpp, washing_machine_prog.h/.cpp (233 lines)

### ESP32 Code Export
- Esp32Exporter: generates hal.h + pid_config.h + main.c + CMakeLists.txt
- Pin definitions, GPIO init, ADC/PWM wrappers, PID config
- Files: esp32_exporter.h/.cpp (180 lines)

### Infrastructure
- modules_init.h: force-link registrars for static library builds
- CMakeLists.txt: updated with all new sources
- Totals: ~1061 new lines, project total ~3183 lines C++17
