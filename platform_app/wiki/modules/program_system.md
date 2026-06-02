# Program System

## Overview

Ready-made control programs with pin mapping, schedule execution, and ESP32 code export. Think of it as visual programming for embedded devices.

## Architecture

```
ProgramSystemModule
├── Program Registry (static, REGISTER_PROGRAM)
│   ├── Greenhouse (3 PID loops, day/night)
│   ├── Smart Fan (temp→RPM curve)
│   └── Washing Machine (5 cycles, schedule)
├── ProgramBase (selected program)
├── PinMappingWidget (Signal→GPIO table)
└── Log

Export →
    hal.h
    pid_config.h
    main.c
    CMakeLists.txt
```

### Program States

```
IDLE → RUNNING ↔ PAUSED
  ↓       ↓
COMPLETED ERROR
  ↓
IDLE (stop)
```

### Base class (`modules/programs/program_core.h`)

| Method | Description |
|--------|-------------|
| `start()` | Begin execution at t=0 |
| `stop()` | Reset to IDLE |
| `pause()` / `resume()` | Toggle RUNNING/PAUSED |
| `tick(dtSec)` | Advance simulation by dt seconds |
| `toJson()` / `fromJson()` | Serialize for .ucp project |

### Pin Mapping

Each program declares default PinMapping entries:

| Field | Example | Description |
|-------|---------|-------------|
| signalName | "temp_sensor" | Logical signal name |
| gpio | 34 | ESP32 GPIO number |
| direction | "adc", "pwm", "input", "output" | GPIO mode |
| defaultValue | 0.0 | Startup value |

User edits these in the PinMappingWidget (QTableWidget).

### Schedule

Array of timed steps executed by `tick()`:

| Field | Example | Description |
|-------|---------|-------------|
| timeSec | 0 | Seconds from start |
| action | "set_setpoint" | set_setpoint, wait, set_output, loop |
| value | 25.0 | Setpoint value |
| target | "temp_loop" | Target PID loop |

## Programs

### Greenhouse

Purpose: Climate control for a greenhouse.
- 9 pins (temp/humidity/light sensors + heater/humidifier/fan/LED/valve/servo)
- 3 PID loops: temperature (25°C day / 20°C night), humidity (60/70%), light (500/0 lux)
- 24-hour repeating schedule with dawn/dusk transitions

### Smart Fan

Purpose: Temperature-controlled ventilation.
- 6 pins (temp sensor, motor PWM, tacho, buttons, status LED)
- Direct temperature→RPM mapping (no PID)
- Boost mode (5min at 30°C setpoint) after timer trigger
- Fan curve: 0% at 20°C → 100% at 40°C

### Washing Machine

Purpose: Full wash cycle controller.
- 12 pins (motor, valves, pump, heater, sensors, door, LED, buzzer)
- 5 cycle types: Cotton (60°C, 60min), Synthetic, Wool, Quick (30°C, 30min), Rinse+Spin
- PID for motor speed and heater temperature
- Schedule includes: fill, heat, wash, drain, rinse, spin, done

## ESP32 Export

`Esp32Exporter` generates a complete ESP-IDF component:

| File | Content |
|------|---------|
| `hal.h` | `#define PIN_TEMP_SENSOR 34`, `hal_init()`, `hal_analog_read/write` |
| `pid_config.h` | Static array of `pid_config_t` with Kp/Ki/Kd |
| `main.c` | `app_main()` with FreeRTOS loop + `hal_init()` |
| `CMakeLists.txt` | ESP-IDF component CMake |

Run from UI: "Export Firmware" button → select directory → 4 files generated.
