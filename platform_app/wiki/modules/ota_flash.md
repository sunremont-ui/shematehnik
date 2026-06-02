# OTA Flash Module

Flashes ESP32 firmware `.bin` files over a COM port using `esptool.py` as a subprocess.

## Location

`platform_app/modules/ota/ota_flash_module.h/.cpp`  
Registered type: `"OtaFlashModule"`  
Top-level module (no parent)

## Functionality

1. User selects a COM port (auto-populated from `QSerialPortInfo` or static COM1–3 fallback)
2. User picks a `.bin` file via file dialog
3. User sets flash address (default `0x0`)
4. Click "Flash" → spawns `python -m esptool` subprocess
5. stdout/stderr streamed to log; progress regex extracts percentage → `QProgressBar`

## esptool Command

```
python -m esptool --port <COM> --baud 460800 write_flash --flash_mode dio --flash_freq 40m --flash_size detect <addr> <file>
```

Built by `OtaFlashModule::buildArgs(port, file, addr)` — public method, testable without process.

## Progress Parsing

`static int parseProgressLine(const QString &line)`:
- Regex: `\(\s*(\d+)\s*%\)`
- Returns integer 0–100 or -1 if no match
- Public static — pure unit-testable

## Build Guard

The entire module is excluded from WASM builds:
```cmake
$<$<NOT:$<BOOL:${UCP_WASM}>>:modules/ota/ota_flash_module.cpp>
```

Port enumeration uses `#ifdef HAS_QT_SERIALPORT` (requires `Qt6::SerialPort`); falls back to a static COM1/COM2/COM3 list otherwise.

## Prerequisites

- Python 3 in PATH with `esptool` installed: `pip install esptool`
- ESP32 connected via USB-to-serial adapter

## Tests

`tests/test_integration.cpp`:
- `ota_widget_not_null` — widget() returns non-null
- `ota_build_args_port` — verifies port in buildArgs output
- `ota_build_args_file` — verifies file path in buildArgs output
- `ota_build_args_addr` — verifies address in buildArgs output
- `ota_build_args_defaults` — default addr is `0x0`
- `ota_parse_progress` / `ota_parse_no_match` / `ota_parse_boundary` — regex edge cases
