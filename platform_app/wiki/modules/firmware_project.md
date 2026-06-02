# Firmware Project Module

Визуальная панель для ведения embedded-прошивок внутри UCP. Читает `.firmproj`-файлы (JSON) и показывает дерево модулей прошивки с цветовыми статусами. Из этой же панели можно отдать модуль на реализацию [Firmware Agent Runner](firmware_agent_runner.md) — статус становится `IN_AGENT`, и в EventBus летит событие `firmware_project.agent.request`.

## Location

- Исходники: `platform_app/modules/firmware_project/firmware_project_module.{h,cpp}`
- Зарегистрированный тип: `"FirmwareProjectModule"`
- Top-level module (no parent)

## Поддерживаемые проекты

Дескрипторы лежат рядом с прошивками:

| Проект | Дескриптор |
|--------|-----------|
| Filament Dryer | `d:/shemaTehnik/filament_dryer/firmware/dryer.firmproj` |
| Soldering Iron | `d:/shemaTehnik/soldering_iron/firmware/soldering_iron.firmproj` |

Известные пути авто-подгружаются в combo «Project» при первом запуске. Дополнительные `.firmproj` можно открыть кнопкой **Open .firmproj…**; недавние сохраняются в `QSettings` под ключом `firmware_project/recent`.

## Формат `.firmproj`

```json
{
    "version": 1,
    "name": "Filament Dryer Firmware",
    "root": "d:/shemaTehnik/filament_dryer/firmware",
    "mcu": "STM32F401CCU6",
    "modules": [
        {
            "id": "sensors_dht11",
            "name": "DHT11 (T+RH камеры)",
            "category": "sensors",
            "status": "DONE",
            "files": ["modules/sensors/humidity/driver/dht11.c", "…"],
            "description": "DWT-тайминг, 40 бит, CRC",
            "spec": ".claude/commands/dryer-impl-dht11.md",
            "agent_prompt": "(optional, заполняется UI при «Отдать агенту»)"
        }
    ]
}
```

### Категории (свободные строки, группируются в дереве)
`core`, `sensors`, `actuators`, `logic`, `display`, `input`, `build`, `tuning`, `improvement`.

### Статусы (с цветовыми метками)

| Статус | Цвет | Когда |
|--------|------|-------|
| `TODO` | серый | по умолчанию, не начато |
| `IN_PROGRESS` | оранжевый | ты сам работаешь над модулем |
| `IN_AGENT` | фиолетовый | отдано в Agent Runner |
| `REVIEW` | синий | ждёт твоего ревью |
| `DONE` | зелёный | реализовано и проверено |
| `BLOCKED` | красный | зависит от внешнего (например, startup-файлы CubeMX) |

Смена статуса в UI **записывается обратно в `.firmproj`** (форматированный JSON с indent).

## UI

```
┌─────────────────────────────────────────────────────────────┐
│ Project: [dryer.firmproj ▼] [Open…] [Reload]   <name · MCU> │
├──────────────┬───────────────────────────┬──────────────────┤
│ Tree         │ Module details            │ Spec / Notes     │
│ ─sensors─    │ ─name (status)─           │  (markdown raw   │
│   DHT11 DONE │  category · status: …     │   from spec      │
│   NTC   DONE │  Description (textarea)   │   field)         │
│ ─actuators─  │  Files (textarea)         │                  │
│   Heater TODO│  [Open file] [Ask agent…] │                  │
└──────────────┴───────────────────────────┴──────────────────┘
```

- **Open file** — `QDesktopServices::openUrl()` для файла под курсором в textarea «Files» (или первого в списке).
- **Ask agent…** — `QInputDialog::getMultiLineText()` с дефолтным промптом из спеки + ставит статус `IN_AGENT` + эмитит событие.

## Events

### Эмитит
`firmware_project.agent.request` — JSON-payload:
```json
{
    "project": "Filament Dryer Firmware",
    "module":  "actuators_heater",
    "prompt":  "Реализуй модуль…",
    "root":    "d:/shemaTehnik/filament_dryer/firmware"
}
```

Подписчик — [Firmware Agent Runner](firmware_agent_runner.md).

### Слушает
Пока ничего. План: подписаться на `firmware_project.agent.completed`, чтобы автоматически менять `IN_AGENT → REVIEW/DONE`.

## Test hooks

Public для тестов:
- `loadProjectFile(path)` — загрузить .firmproj без UI
- `moduleCount()`, `projectName()`, `projectRoot()`, `knownStatuses()`

См. также `tests/test_smoke.cpp` — модуль в `ALL_MODULE_TYPES`, проходит factory + init + widget.

## See also

- [Firmware Agent Runner](firmware_agent_runner.md) — что делает с событием
- [Soldering Iron Firmware](soldering_iron_firmware.md) — первый «гость» в системе
- [STM32 Firmware Architecture](../concepts/stm32-firmware-architecture.md) — шаблон, по которому размечены модули в .firmproj
