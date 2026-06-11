# Claude Code Skills — UCP Project

Available slash commands when working in this repository.

## UCP Project — Build & Test

| Команда | Назначение |
|---------|-----------|
| `/ucp-build` | Сборка проекта через CMake + Ninja (GCC MinGW64) |
| `/ucp-test` | Запуск всех трёх test-суитов с `ctest --output-on-failure` |
| `/ucp-roadmap` | Дашборд прогресса по roadmap: что сделано, что следующее |
| `/ucp-web` | Сборка/запуск/проверка веб-фронтенда (React+TS+Vite) в `platform_app/web/`. См. [Web Frontend](modules/web_frontend.md) |
| `/ucp-web-roadmap` | Дашборд roadmap веб-фронтенда (цикл 2, фазы 10–17) |
| `/ucp-web-module` | Добавить/расширить модуль веб-фронтенда |
| `/ucp-web-route` | A*-роутер: устройство и тюнинг |

## UCP Web — Implementation (цикл 2, фазы 10–17)

См. [roadmap-web.md](roadmap-web.md). Конвенция: после пункта — галочка в roadmap + запись в [log.md](log.md) + коммит.

| Команда | Фаза | Назначение |
|---------|------|-----------|
| `/ucp-web-impl-serial` | 10.1–10.3 | Web Serial: слой `serial.ts`, реальный UART Monitor, PID live-телеметрия |
| `/ucp-web-impl-ota` | 10.4 | Реальная прошивка ESP32 через esptool-js |
| `/ucp-web-impl-spice-nonlinear` | 11 | Диод/BJT/MOSFET (Ньютон-Рафсон), DC sweep, курсоры/CSV |
| `/ucp-web-impl-pcb-drc` | 12.1 | Clearance-DRC: зазоры дорожка/пад/via |
| `/ucp-web-impl-pcb-edit` | 12.2–12.5 | Ручные дорожки, copper pour, контур+silkscreen, pick-and-place |
| `/ucp-web-impl-sch-ux` | 13 | Multi-select, copy/paste, junction dots, inline edit, ERC типы пинов |
| `/ucp-web-impl-library` | 14 | Пользовательские детали (Symbol Editor), импорт `.kicad_sym`, 50+ деталей |
| `/ucp-web-impl-fsm` | 15.1 | Визуальный FSM-редактор → генерация C switch-case |
| `/ucp-web-impl-analyzer` | 15.2 | Реальный декод: Packet Editor → UART capture → Analyzer |
| `/ucp-web-impl-ai` | 15.3 | (опц.) AI Schematic через Claude API с ключом пользователя |
| `/ucp-web-impl-project-v2` | 16.1 | `.ucp` v2 — все артефакты в одном файле + миграция |
| `/ucp-web-impl-system` | 16.2–16.6 | Code-split three, FS Access API, PWA, error boundary, Ctrl+K |
| `/ucp-web-impl-new-modules` | 17 | Filter Designer, Pin Planner, EE Calculators, Logic Analyzer, Power Budget, Register Map |

## Firmware Project (v3.1)

| Команда | Назначение |
|---------|-----------|
| `/firmware-project` | Работа с `.firmproj`: добавить модуль, сменить статус, открыть в UCP. См. [Firmware Project](modules/firmware_project.md) + [Firmware Agent Runner](modules/firmware_agent_runner.md) |

## UCP Project — Implementation (v1.0) ✓ DONE

| Команда | Статус | Назначение |
|---------|--------|-----------|
| `/ucp-impl-wire-serial` | ✓ DONE | Сериализация проводников в `SchematicScene` |
| `/ucp-impl-eventbus-unsub` | ✓ DONE | `EventBus::off(receiver)` + автоочистка при destroy |
| `/ucp-impl-project-save` | ✓ DONE | File→Save/Open в MainWindow (уже было реализовано) |

## UCP Project — Implementation (v1.1–v1.3) ✓ DONE

| Команда | Статус | Назначение | Milestone |
|---------|--------|-----------|-----------|
| `/ucp-impl-net-labels` | ✓ DONE | `SchematicNetLabel` — именованные цепи (VCC, GND) | v1.1 |
| `/ucp-impl-ratsnest` | ✓ DONE | Ратснест на PCB: dashed-airwires по netId | v1.2 |
| `/ucp-impl-pid-plot` | ✓ DONE | `QChart` rolling-window для PID (setpoint/input/output) | v1.3 |
| `/ucp-impl-pid-serial` | ✓ DONE | PID EventBus tick → UartMonitor TX queue | v1.2 |
| `/ucp-impl-pcb-drc` | ✓ DONE | DRC: trace shorts, min width, unconnected nets | v1.2 |
| `/ucp-impl-autosave` | ✓ DONE | Автосохранение в `<name>.ucp.bak` каждые 5 мин | v1.3 |
| `/ucp-impl-ci` | ✓ DONE | GitHub Actions: Windows/Ubuntu/macOS CI матрица | v0.9.1 |

## UCP Project — Implementation (v2.0) ✓ DONE

| Команда | Статус | Назначение |
|---------|--------|-----------|
| `/ucp-impl-ai-schematic` | ✓ DONE | Claude API → JSON → авто-размещение компонентов на схеме |
| `/ucp-impl-ota-flash` | ✓ DONE | OTA Flash: esptool.py subprocess + прогресс-бар |
| `/ucp-impl-wasm` | ✓ DONE | Qt for WebAssembly: cmake/wasm.cmake + CI job |

## Wiki & Knowledge

| Команда | Назначение |
|---------|-----------|
| `/wiki` | Общий вход: запрос / ingest / lint / добавить страницу |
| `/wiki-ingest` | Обработать источник из `raw/` в страницы вики |
| `/wiki-query` | Ответить на вопрос по содержимому вики |
| `/wiki-lint` | Найти сироты, противоречия, устаревшие данные |
| `/wiki-add` | Создать новую страницу концепции |
| `/wiki-status` | Дашборд вики: количество страниц, пробелы |
| `/wiki-synth` | Синтез по теме из нескольких страниц |
| `/mcu-wiki` | Запросы к MCU-вики (`wikiMemory/`) |
| `/mcu-gen` | Генерация кода для MCU (DevForge) |

## Качество кода

| Команда | Назначение |
|---------|-----------|
| `/simplify` | Ревью изменённого кода на качество и переиспользование |
| `/review` | Ревью pull request |
| `/security-review` | Аудит безопасности текущей ветки |
| `/init` | Инициализировать CLAUDE.md для репозитория |

## Настройка окружения

| Команда | Назначение |
|---------|-----------|
| `/update-config` | Редактировать settings.json: разрешения, хуки, env |
| `/keybindings-help` | Настроить горячие клавиши Claude Code |
| `/fewer-permission-prompts` | Добавить allowlist для частых команд |
| `/loop` | Запускать команду с интервалом |
| `/schedule` | Запланировать агента по cron |

## Использование

1. Введи `/команда` в чате — Claude Code вызовет нужный скилл
2. Скиллы `/ucp-impl-*` содержат полный контекст кодовой базы — можно вызвать в новой сессии
3. Для вики-операций всегда уточняй контекст:
   - UCP вики → `platform_app/wiki/`
   - MCU вики → `wikiMemory/`
4. После реализации фичи отмечай в `wiki/roadmap.md` соответствующий пункт
