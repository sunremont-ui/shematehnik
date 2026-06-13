# Wiki Index

Catalog of all wiki pages, organized by category.

## Core

| Page | Summary |
|------|---------|
| [Overview](overview.md) | What this project is and why it exists |
| [Philosophy](philosophy.md) | Design principles, values, and approach |
| [Roadmap](roadmap.md) | Version plan v0.1 → v2.0 (ENTIRE ROADMAP COMPLETE) |
| [Roadmap — Web](roadmap-web.md) | Веб-фронтенд: цикл 2 фазы 10–17 закрыты, следующий контур — LVGL Lab / UI Designer 2.0 |

## Architecture

| Page | Summary |
|------|---------|
| [Module System](architecture/module_system.md) | How modules contain sub-modules (tree) |
| [Event Bus](architecture/event_bus.md) | Inter-module communication pattern |
| [Project File Format](architecture/project_format.md) | .ucp JSON schema |
| [Plugin System](architecture/plugin_system.md) | REGISTER_MODULE, dynamic loading |
| [Tech Stack](architecture/tech_stack.md) | C++17, Qt6, ngspice, Emscripten (WASM) |

## Modules

| Page | Summary |
|------|---------|
| [Schematic Editor](modules/schematic_editor.md) | Circuit diagram editor: SymbolEditor, WireTool, NetlistGenerator |
| [SPICE Simulator](modules/spice.md) | ngspice integration, raw-file parser, WaveformWidget |
| [PCB Layout](modules/pcb.md) | Footprints, trace routing, DRC, Gerber export |
| [3D Editor](modules/threed.md) | Isometric QPainter renderer, primitives, STL export |
| [PID Tuner](modules/pid_tuner.md) | PID loops with real-time graphing and autotuning |
| [Program System](modules/program_system.md) | Ready-made programs (greenhouse, washer, fan) |
| [Protocol Designer](modules/protocol.md) | Sequence diagrams, packet editor, UART monitor, analyzer |
| [Code Generator](modules/codegen.md) | CRC, LVGL export, Arduino/ESP-IDF, protocol codegen, Pin Planner, Power Budget, Register Map |
| [AI Schematic](modules/ai_schematic.md) | Claude API → JSON parse → auto-place components + wires |
| [OTA Flash](modules/ota_flash.md) | esptool.py via QProcess → ESP32 COM flash with progress |
| [Firmware Project](modules/firmware_project.md) | Визуальная панель прошивок: дерево .firmproj со статусами, «Отдать агенту» через EventBus |
| [Firmware Agent Runner](modules/firmware_agent_runner.md) | Claude CLI в git worktree per task: spawn + log + diff + cleanup |
| [Soldering Iron Firmware](modules/soldering_iron_firmware.md) | STM32F401 firmware: SSD1306 + энкодер + NTC + симистор, модульная архитектура |
| [Web Frontend](modules/web_frontend.md) | Веб-версия UI (React+TS+Vite): порт десктоп-оболочки, 31 модуль интерактивен |

## Concepts

| Page | Summary |
|------|---------|
| [HAL — Hardware Abstraction](concepts/hal.md) | Signal↔GPIO mapping table |
| [Pin Mapping UI](concepts/pin_mapping.md) | How users assign pins in the UI |
| [PID Control](concepts/pid.md) | PID algorithm, autotuning, anti-windup |
| [Simulation Pipeline](concepts/simulation.md) | Schematic → Netlist → ngspice → plot |
| [Protocol Description](concepts/protocols.md) | How we describe UART/I2C/SPI protocols |
| [STM32 Firmware Architecture](concepts/stm32-firmware-architecture.md) | Шаблон модульной firmware для STM32: driver+module, EventBus, FSM, Flash, Standby |

## Integration

| Page | Summary |
|------|---------|
| [KiCad Integration](integration/kicad.md) | Import KiCad schematics and libraries |
| [FreeCAD Integration](integration/freecad.md) | Reuse FreeCAD 3D parts via OpenCASCADE |
| [SquareLine Studio Bridge](integration/squareline.md) | Boundary and lab path for future SquareLine/LVGL bridge work |
| [Proteus Replacement](integration/proteus.md) | Where we replace vs complement Proteus |

## Indexing

- **Sources:** [raw/](raw/) — external docs, articles, reference files
- **Log:** [log.md](log.md) — chronological record of changes
- **Schema:** [AGENTS.md](AGENTS.md) — LLM wiki conventions
- **Skills:** [skills.md](skills.md) — available Claude Code slash commands
