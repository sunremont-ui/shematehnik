# Universal Controller Platform (UCP)

**Version 2.0.0** — Modular EDA + firmware development desktop application.  
Replaces KiCad + SquareLine Studio + Proteus in a single Qt6 app.

---

## Table of Contents / Содержание

- [English](#english)
- [Русский](#русский)

---

## English

### What is UCP?

UCP is a modular desktop tool for embedded/controller hardware development. It combines:

| Module | Function |
|--------|----------|
| Schematic Editor | Draw circuits, place components, auto-route wires |
| SPICE Simulator | Run ngspice simulations, view waveforms |
| PCB Layout | Route traces, place footprints, DRC, Gerber export |
| 3D Editor | Visualize PCB + enclosure, CSG boolean ops, STEP export |
| PID Tuner | Design and simulate multi-channel PID controllers |
| Program System | Ready-made embedded programs (greenhouse, fan, washer) |
| Protocol Designer | UART/I2C/SPI sequence diagrams, packet editor, analyzer |
| Code Generator | CRC calc, LVGL UI export, Arduino/ESP-IDF code |
| AI Schematic | Generate schematics from natural language via Claude API |
| OTA Flash | Flash ESP32 firmware over COM port |

### Requirements

- **OS:** Windows 10/11, Ubuntu 22.04+, macOS 13+
- **Qt:** 6.6+ (Widgets + Svg required; Charts / Network / SerialPort optional)
- **ngspice:** for SPICE simulation (optional)
- **Python + esptool:** for OTA Flash — `pip install esptool`

### Build

**Windows (MSYS2 MinGW64):**
```powershell
$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
cd platform_app
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
```

**Ubuntu:**
```bash
sudo apt install cmake ninja-build qt6-base-dev libqt6svg6-dev libgl1-mesa-dev
cd platform_app
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
```

**macOS:**
```bash
brew install qt6 cmake ninja
cd platform_app
cmake -B build -G Ninja -DCMAKE_PREFIX_PATH=$(brew --prefix qt6) -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
```

### Run

```powershell
# Windows
$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
.\platform_app\build\ucp.exe

# Linux / macOS
./platform_app/build/ucp
```

To enable **AI Schematic**, set your Claude API key:
```powershell
$env:UCP_CLAUDE_KEY = "sk-ant-..."
```

### Tests

```bash
cd platform_app/build
QT_QPA_PLATFORM=offscreen ctest --output-on-failure
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| CoreTests | 8 | Module tree, EventBus |
| SmokeTests | 64 | All 22 module types: factory + init + widget |
| IntegrationTests | 36 | CRC, PID, Schematic, PCB, CSG, STEP, AI, OTA |

### CLI mode

```bash
ucp --build project.ucp    # headless: print project info
ucp --lang ru              # force Russian UI
```

### WebAssembly build

```bash
source ~/emsdk/emsdk_env.sh
cd platform_app
cmake -B build-wasm \
  -DCMAKE_TOOLCHAIN_FILE=cmake/wasm.cmake \
  -DQT_WASM_ROOT=~/Qt/6.6.0/wasm_singlethread
cmake --build build-wasm --parallel
# Output: build-wasm/ucp.html
```

### Web frontend (React + TypeScript + Vite)

A standalone web port of the desktop shell lives in [`web/`](web/) — all 25 modules
as interactive views, mirroring the Qt UI 1:1. Not a WASM build of the Qt app.

```bash
cd platform_app/web
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

See [`wiki/modules/web_frontend.md`](wiki/modules/web_frontend.md) or run `/ucp-web`.

### Project file format

Projects saved as `.ucp` (JSON). Open with **File → Open** (`Ctrl+O`) or drag onto the window.

### Documentation

- Full user guide: [`wiki/user_guide.md`](wiki/user_guide.md)
- Module reference: [`wiki/modules/`](wiki/modules/)
- Architecture: [`wiki/architecture/`](wiki/architecture/)

---

## Русский

### Что такое UCP?

UCP — модульный десктопный инструмент для разработки встраиваемых систем. Заменяет KiCad + SquareLine Studio + Proteus в одном приложении на Qt6.

| Модуль | Назначение |
|--------|-----------|
| Редактор схем | Рисование схем, размещение компонентов, автотрассировка |
| SPICE-симулятор | Запуск ngspice, просмотр осциллограмм |
| Трассировщик PCB | Трассы, footprint, DRC, экспорт Gerber |
| 3D-редактор | Визуализация PCB + корпуса, булевы операции CSG, экспорт STEP |
| PID-тюнер | Проектирование и симуляция многоканальных ПИД-регуляторов |
| Система программ | Готовые прошивки (теплица, вентилятор, стиральная машина) |
| Дизайнер протоколов | Диаграммы UART/I2C/SPI, редактор пакетов, анализатор |
| Генератор кода | CRC, экспорт LVGL UI, Arduino/ESP-IDF |
| AI-схема | Генерация схем по описанию через Claude API |
| OTA-прошивка | Прошивка ESP32 через COM-порт |

### Требования

- **ОС:** Windows 10/11, Ubuntu 22.04+, macOS 13+
- **Qt:** 6.6+ (обязательно: Widgets, Svg; опционально: Charts, Network, SerialPort)
- **ngspice:** для SPICE-симуляции (опционально)
- **Python + esptool:** для OTA — `pip install esptool`

### Сборка

**Windows (MSYS2 MinGW64):**
```powershell
$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
cd platform_app
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
```

**Ubuntu:**
```bash
sudo apt install cmake ninja-build qt6-base-dev libqt6svg6-dev libgl1-mesa-dev
cd platform_app && cmake -B build -G Ninja && cmake --build build --parallel
```

### Запуск

```powershell
$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
.\platform_app\build\ucp.exe
```

Для AI-схем:
```powershell
$env:UCP_CLAUDE_KEY = "sk-ant-..."
```

### Тесты

```bash
cd platform_app/build
QT_QPA_PLATFORM=offscreen ctest --output-on-failure
```

Три набора: **CoreTests** (8), **SmokeTests** (64), **IntegrationTests** (36).

### Веб-фронтенд (React + TypeScript + Vite)

Самостоятельный веб-порт десктоп-оболочки в [`web/`](web/) — все 25 модулей как
интерактивные виды, UI повторяет Qt 1:1. Это не WASM-сборка Qt.

```bash
cd platform_app/web
npm install
npm run dev      # http://localhost:5173
```

Подробнее: [`wiki/modules/web_frontend.md`](wiki/modules/web_frontend.md) или скилл `/ucp-web`.

### Формат проекта

Проекты сохраняются в `.ucp` (JSON). Открыть: **Файл → Открыть** (`Ctrl+O`).  
Автосохранение каждые 5 минут в `<имя>.ucp.bak`.

### Документация

- Руководство пользователя: [`wiki/user_guide.md`](wiki/user_guide.md)
- Описание модулей: [`wiki/modules/`](wiki/modules/)
- Архитектура: [`wiki/architecture/`](wiki/architecture/)

### Структура каталогов

```
platform_app/
├── app/          main.cpp, MainWindow
├── core/         Module, ModuleFactory, EventBus, Project
├── modules/
│   ├── schematic/    SchematicModule, SPICEModule, SymbolEditor
│   ├── pcb/          PcbModule, PcbScene, DRC
│   ├── threed/       ThreeDModule, CSG, StepWriter
│   ├── pid/          PidTunerModule, PidCore
│   ├── programs/     ProgramSystemModule, Greenhouse, Fan, WashingMachine
│   ├── protocol/     ProtocolModule, UartMonitorModule, PacketEditor, Analyzer
│   ├── codegen/      CodeGenModule, CrcCalculator, LvglExport, ArduinoExport
│   ├── ai/           AiSchematicModule
│   └── ota/          OtaFlashModule
├── tests/        test_core.cpp, test_smoke.cpp, test_integration.cpp
├── web/          Веб-фронтенд (React + TypeScript + Vite), порт UI
├── wiki/         Документация / Documentation
└── cmake/        wasm.cmake
```
