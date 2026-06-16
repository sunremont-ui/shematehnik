# Roadmap

## Legend

| Icon | Meaning |
|------|---------|
| ✓ | Done |
| ◐ | In progress |
| ○ | Planned |
| ◇ | Future / stretch |

---

## v0.1 — Core ✓ DONE
- [x] Module tree, ModuleFactory, EventBus, Project save/load
- [x] MainWindow (tree left, workspace right)

## v0.2 — Schematic Editor ✓ DONE
- [x] QGraphicsScene: components, wires, pins
- [x] Drag-and-drop component library
- [x] Undo/Redo (QUndoStack): Add/Wire/Delete/Move
- [x] Value Editor: double-click dialog (RefDes + Value)
- [x] SVG Export via QSvgGenerator
- [x] Delete key removes selected + connected wires
- [x] Symbol Editor: QGraphicsScene draw tool (Line/Rect/Circle/Text), grid snap, Pin table, Save/Load JSON

## v0.3 — SPICE Simulation ✓ DONE
- [x] NetlistGenerator: DFS net tracing, full SPICE output
- [x] ngspice subprocess integration
- [x] SPICE3 raw format parser
- [x] WaveformWidget: QPainter graphs, grid, legend, cursor
- [x] Analysis selector: Transient / AC Sweep / DC Sweep with parameter UI; injected into netlist at run-time

## v0.4 — PCB Layout ✓ DONE
- [x] PcbScene: 4 layers (F.Cu, B.Cu, F.SilkS, Edge.Cuts)
- [x] PcbPad: SMD and through-hole
- [x] PcbTrace: copper trace with layer + width
- [x] PcbVia: through-hole via
- [x] PcbFootprint: 8 built-in (R_0805, C_0402, C_0805, DIP8, DIP14, SOT23, TO92, Conn_01x02)
- [x] Trace routing mode, grid snap 0.25mm
- [x] Layer visibility toggle
- [x] DRC: basic clearance check
- [x] Gerber Export: RS-274X for all 4 layers
- [x] Undo/Redo for PCB: AddPcbTraceCmd / AddPcbViaCmd / AddPcbFootprintCmd (QUndoStack)
- [x] Auto-placement from netlist: EventBus netlist.generated → importFromNetlist(), 8-column grid layout

## v0.5 — PID + Program System ✓ DONE
- [x] PIDCore: P+I+D, anti-windup, Ziegler-Nichols
- [x] PIDTunerModule: multi-channel, sliders, real-time graph
- [x] ProgramCore + ProgramRegistry (REGISTER_PROGRAM macro)
- [x] ProgramSystemModule: list, start/stop/pause
- [x] PinMappingUI: Signal→GPIO table
- [x] Programs: Fan, Greenhouse (3 PID), Washing Machine
- [x] ESP32 Code Exporter: hal.h + pid_config.h + main.c

## v0.6 — 3D Editor ✓ DONE
- [x] ThreeDView: QPainter isometric renderer (no OpenCASCADE dependency)
- [x] Rotation: LMB drag on all axes; Zoom: mouse wheel
- [x] BoxPrimitive: 6-face box with shading
- [x] CylinderPrimitive: N=16 segments, caps + sides
- [x] BoardPrimitive: flat PCB board with green top face
- [x] Painter's algorithm: depth-sorted face rendering
- [x] Directional light shading (dot product with normal)
- [x] PrimitivePropsPanel: Pos XYZ + Size XYZ spinboxes
- [x] STL Export: binary format with proper triangle normals
- [x] Object list with type icons
- [x] Boolean operations (union/subtract) — done in v1.3 via built-in BSP tree (`CsgResultPrimitive`), no external CSG library
- [x] STEP export — done in v1.3 via built-in `StepWriter` (AP214 triangulated shell), no OpenCASCADE

## v0.7 — Protocol Designer ✓ DONE
- [x] SequenceDiagramModule: Mermaid-compatible parser + QPainter renderer
- [x] Presets: UART 8N1, I2C Write, SPI Full-Duplex, Modbus RTU
- [x] PacketEditorModule: bit-field table + visual bit map
- [x] C struct export with #pragma pack and bit-fields
- [x] Packet presets: UART, Modbus RTU, 32-bit control register
- [x] UART Monitor: port/baud/format selector, RX log, TX send, Hex mode, real QSerialPort if Qt6::SerialPort linked
- [x] I2C/SPI protocol analyzer: parseHexInput(), decodeI2C() START/ADDR/ACK/DATA/STOP, decodeSPI() MOSI/MISO pairs

## v0.8 — Code Generator ✓ DONE
- [x] CrcCalculatorModule: 12 algorithms (CRC-8, CRC-16/Modbus, CRC-32, etc.)
- [x] CRC C code generator: lookup-table implementation
- [x] LvglExportModule: 4 screens (main_menu, program_select, pin_mapping, monitor)
- [x] LVGL export to folder: ui_*.c + ui_*.h + main.c + CMakeLists.txt
- [x] ArduinoExportModule: Arduino (.ino), ESP-IDF (main.c), PlatformIO
- [x] Pre-built pin maps for Greenhouse, Fan, Washing Machine
- [x] ESP32 Exporter (from v0.5): hal.h + pid_config.h
- [x] Protocol code gen: ProtocolCodeGenModule — #pragma pack struct + _encode()/_decode() with CRC, exportFiles() writes .h + crc.c

## v0.9 — Polish ✓ DONE
- [x] Status bar: EventBus "status.message" → auto-clear after 5s
- [x] Dark theme: full QPalette + QSS stylesheet
- [x] Light theme toggle (View menu)
- [x] About dialog: module list + version + tech stack
- [x] Shortcuts dialog (Ctrl+/): all keyboard shortcuts listed
- [x] Module tree toggle (Ctrl+\)
- [x] Window title: project name + module name + modified indicator
- [x] Multilingual (RU/EN via QTranslator): ucp_ru.ts + ucp_en.ts, --lang CLI flag, locale auto-detect
- [x] CLI build: ucp --build project.ucp → headless JSON project info (name/version/module count)
- [x] Unit tests (8): StubModule + TestCore, CMakeLists ucp_core link
- [x] Smoke tests (62): factory + init() + widget() non-null, QT_QPA_PLATFORM=offscreen

## v0.9.1 — Bug Fixes + Integration Tests ✓ DONE
- [x] Integration tests (18): CRC known vectors, PID step/clamp/autotune, Schematic CRUD + roundtrip, PCB DRC + footprint
- [x] **Bug**: `SchematicScene::addWire()` double-called `connectWire()` — wire stored 3× in pin list
- [x] **Bug**: `SchematicScene::clear()` use-after-free — pins deleted before wire destructor runs
- [x] **Bug**: `nextRefdes()` shared counter — R1/R2/C3 instead of R1/R2/C1. Fixed: `QHash<QString,int>` per prefix
- [x] **Bug**: `PcbScene` Delete key bypassed undo stack. Fixed: `DeletePcbItemsCmd`
- [x] **Bug**: `deserialize()` iterated temporary `QJsonObject` → dangling iterator crash
- [x] Skills: `/ucp-build`, `/ucp-test` in `.claude/commands/`
- [x] **CI**: GitHub Actions matrix (Windows MSYS2, Ubuntu, macOS)

## v1.0 — Stable Foundation

- [x] **Project save/load wired to UI**: `MainWindow` File→Save/Open (Ctrl+S/O) + `"[*]"` modified title — already fully implemented
- [x] **Wire serialization**: `SchematicScene::serialize()` encodes `{from:{refdes,pin}, to:{refdes,pin}}`; `deserialize()` restores wires via refdes lookup + integration test `schematic_wire_roundtrip`
- [x] **EventBus unsubscribe**: `off(QObject*)` added — stores `QMultiHash<QObject*,QMetaObject::Connection>`, auto-cleanup on `destroyed`, called from `Module::destroy()`
- [x] Stable API for third-party modules (`IModule` interface, pimpl/forward-decls)
- [x] Documentation (Qt Help format)
- [x] Package managers (winget, brew, apt)

## v1.1 — Schematic Enhancements

- [x] **Net labels**: `SchematicNetLabel` item — named power/signal nets (VCC, GND, SDA) that logically connect pins without a wire. Update `generateNetlist()` union-find to merge label-named nets
- [x] **Wire routing**: orthogonal bend-point routing (currently L-shape only via midpoint). Add full manhatten routing with obstacle avoidance
- [x] **KiCad import**: parse KiCad v7 `.kicad_sch` s-expression → `SchematicScene` components + wires
- [x] **Component rotation**: R key rotates selected component 90°; update pin positions accordingly

## v1.2 — PCB Enhancements

- [x] **Ratsnest**: thin dashed lines between unrouted pad pairs of the same net. Parse assigned `netId` from imported netlist; update on each trace placed
- [x] **Footprint rotate/flip**: R = rotate 90°, F = flip to B.Cu. Update pad layer on flip
- [x] **PCB DRC improvements**: check for trace-trace shorts, minimum trace width violations, unconnected nets
- [x] **Real-time PID via SerialPort**: pipe `PidChannel` output → `UartMonitorModule` TX queue

## v1.3 — Visualization & UX

- [x] **PID live plot**: `QChart` (Qt6::Charts) rolling-window graph — setpoint / input / output 3-series, 10 s window, updates on simulation timer tick
- [x] **Project autosave**: `QTimer` every 5 min → `Project::save()` to `<name>.ucp.bak`
- [x] **3D Boolean ops** (CSG): subtract/union/intersect via built-in BSP tree — no external library required
- [x] **STEP export** (3D): AP214/AP203 triangulated shell via built-in StepWriter — no OpenCASCADE required

## v2.0 — Advanced / Stretch

- [x] **AI Schematic**: Claude API (QNetworkAccessManager) → JSON parse → place components + wires on SchematicScene
- [x] **OTA Flash**: esptool.py via QProcess → COM port selector → progress bar → flash ESP32 `.bin`
- [x] **WASM**: Qt for WebAssembly — `cmake/wasm.cmake` toolchain, `Q_OS_WASM` guards on QProcess/SerialPort, CI job
- [x] **UI Designer v2**: дизайн-система (UiTheme + ThemeManager), 14 виджетов, .uidesign save/load, EventBus ui.design.ready / ota.flash.request
- [ ] ◇ Collaborative editing (WebSocket / CRDT)
- [ ] ◇ Cloud component library sync

## v3.0 — UI Designer v3: Навигация

- [x] **NavList виджет** (15-й тип): `lv_list_create` + `lv_list_add_btn`, per-item target screen, per-item event callbacks `ui_event_NavListX_N`
- [x] **Screen navigation на Button**: свойства "On Click →" (ComboBox экранов) + "Animation" (MOVE_LEFT/MOVE_RIGHT/FADE_IN/NONE); экспорт → `lv_scr_load_anim()`
- [x] **ScrollPanel**: флаг Scrollable на Panel; экспорт → `lv_obj_add_flag(LV_OBJ_FLAG_SCROLLABLE)` + `lv_obj_set_flex_flow(LV_FLEX_FLOW_COLUMN)`
- [x] **Properties Panel**: ComboBox "On Click →" + "Animation" для Button; QPlainTextEdit пунктов + QTableWidget (пункт → экран) для NavList; QCheckBox для Panel
- [x] **screensListChanged** сигнал в UiScreenTree — автообновление ComboBox экранов при добавлении экрана
- [x] **animEnum()** helper в экспортере: MOVE_LEFT / MOVE_RIGHT / FADE_IN / NONE → LV_SCR_LOAD_ANIM_*
- [x] Экспортированный ui.c содержит рабочие переходы между экранами — прошивается на ESP32/STM32 без ручной правки

### UI Designer v2 ✓ DONE

- [x] `UiTheme` struct (9 colours, typography, radius, spacing) + `ThemeManager` singleton with `darkLvgl`/`light`/`Custom` presets
- [x] `applyTheme(UiTheme)` virtual в каждом виджете; `UiScene::applyTheme()` → все items
- [x] +7 новых виджетов: Chart, Gauge/Meter, TextArea, Checkbox, Roller, Bar, Image (итого 14 типов)
- [x] `UiLvglExporter::generateStyles()` → `ui_theme_init()` в ui.c с `lv_style_t`
- [x] `UiPropertiesPanel` → `QTabWidget` (Widget / Theme); `UiThemeEditor` с color-picker + spinbox
- [x] Toolbar: Open .uidesign / Save .uidesign / Flash via OTA
- [x] EventBus `ui.design.ready` (при Export C), `ota.flash.request` (Flash via OTA)
- [x] `.uidesign` JSON формат v1: `{version, theme, screens[]}`

### v2.0 breakdown

#### AI Schematic ✓ DONE
- [x] `AiSchematicModule` — prompt input + Claude API call (QNetworkAccessManager, HAS_QT_NETWORK)
- [x] Parse JSON response → `{refdes, value, type}` components + connections array
- [x] Place components on `SchematicScene` (8-col grid), draw wires via `addWire(pin,pin)`
- [x] API key via env `UCP_CLAUDE_KEY`; graceful fallback if missing or no network
- [x] EventBus `ai.schematic.ready` — SchematicModule subscribes and populates scene
- [x] Integration tests: valid JSON, markdown stripping, empty components, event emitted

#### OTA Flash ✓ DONE
- [x] `OtaFlashModule` — port selector (QSerialPortInfo or static list), file picker (.bin), flash addr
- [x] `python -m esptool --port X --baud 460800 write_flash --flash_mode dio addr file`
- [x] Stream stdout/stderr to log, `parseProgressLine()` regex `(\d+\s*%)` → QProgressBar
- [x] Guard: `#ifdef HAS_QT_SERIALPORT` for port enumeration; fallback COM list otherwise
- [x] Tests: widget non-null, buildArgs, parseProgressLine (normal/no-match/boundaries)

#### WASM ✓ DONE
- [x] `cmake/wasm.cmake` — Emscripten toolchain, Qt WASM kit path via `QT_WASM_ROOT`/env
- [x] `UCP_WASM` CMake flag — OTA Flash excluded (`$<NOT:$<BOOL:${UCP_WASM}>>`)
- [x] `Q_OS_WASM` guard in `spice_module.h/.cpp` — ngspice QProcess disabled
- [x] `HAS_QT_SERIALPORT` already guards protocol SerialPort
- [x] CI job `wasm` (continue-on-error: true) — emsdk 3.1.50 + aqtinstall Qt 6.6.0 wasm_singlethread
- [x] Upload artifacts: `ucp.html`, `ucp.wasm`, `ucp.js`
