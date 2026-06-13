# Firmware Project — Команда `/firmware-project`

Работа с системой видимых прошивок: `.firmproj`-файлы (JSON-дескрипторы для UCP-модуля `FirmwareProjectModule`) и связанный с ними [Firmware Agent Runner](../../platform_app/wiki/modules/firmware_agent_runner.md).

## Зачем

В UCP есть пара модулей, через которые embedded-проект виден визуально и можно отдавать куски агенту в парном режиме:

- **`FirmwareProjectModule`** — `platform_app/modules/firmware_project/` — дерево модулей прошивки по `.firmproj`, статусы, кнопки «Открыть файл» / «Отдать агенту…»
- **`FirmwareAgentRunnerModule`** — `platform_app/modules/firmware_agent_runner/` — слушает `firmware_project.agent.request`, создаёт git worktree + ветку, спавнит `claude` CLI, показывает log/diff

Текущие `.firmproj`:
- `d:/shemaTehnik/filament_dryer/firmware/dryer.firmproj`
- `d:/shemaTehnik/soldering_iron/firmware/soldering_iron.firmproj`

Подробное описание формата и UI: [wiki/modules/firmware_project.md](../../platform_app/wiki/modules/firmware_project.md), [wiki/modules/firmware_agent_runner.md](../../platform_app/wiki/modules/firmware_agent_runner.md).

## Что делает скилл

В зависимости от запроса пользователя выбери одно из:

### 1. Показать текущее состояние проекта
Прочитай нужный `.firmproj` и выведи компактный дашборд:
```
Filament Dryer Firmware (STM32F401CCU6) — 17 модулей
──────────────────────────────────────────────────
core        ✓✓✓✓             4/4 DONE
sensors     ✓✓✓              3/3 DONE
actuators   ○○○              0/3 TODO
logic       ○○○              0/3 TODO
display     ✓○               1/2 DONE
input       ○                0/1 TODO
build       ⊘                BLOCKED (startup files)
tuning      ○                0/1 TODO
```

### 2. Добавить новый модуль в .firmproj
- Спроси `id`, `name`, `category`, `files`, `description`, опц. `spec`
- Валидируй: `id` уникален в массиве `modules`, файлы существуют относительно `root`
- Дописывай через `Edit` (json indent 4) — не пересоздавай файл
- Сохрани `status: "TODO"` по умолчанию

### 3. Сменить статус модуля
- Найди модуль по `id` в указанном `.firmproj`
- Поменяй `status` на один из: `TODO | IN_PROGRESS | IN_AGENT | REVIEW | DONE | BLOCKED`
- Если ставишь `IN_AGENT` — попроси `agent_prompt` (это то же поле, которое пишет UI «Отдать агенту»)

### 4. Запустить агента на модуль (без UCP UI)
Если пользователь хочет «отдать агенту» из CLI, минуя UCP:
1. Найди git root от `root` проекта (поднимись до `.git`)
2. Создай worktree: `git worktree add -b agent/<safe-proj>-<safe-mod>-<ts> <gitroot>/.worktrees/agent-<…> HEAD`
3. В worktree запусти `claude --print --output-format stream-json --verbose "<prompt>"` (cwd = worktree)
4. После завершения — покажи `git -C <worktree> diff HEAD`
5. Для cleanup: `git worktree remove --force <path>` + `git branch -D <branch>`

⚠ Не делай auto-merge — diff показывается пользователю на ревью.

### 5. Lint .firmproj
Проверь:
- Все `files[]` существуют относительно `root`
- `spec` (если указан) существует
- Статусы из допустимого множества
- Уникальность `id`
- Соответствие реальному коду: модули из дерева `firmware/modules/`, которых нет в `.firmproj`

## Правила

- **Не правь .firmproj если UCP запущен** — он сериализует обратно и затрёт твои изменения. Сначала закрой панель Firmware Project или Reload в нём после правки.
- **Не трогай ключи `version`, `root`, `mcu`** — они задают идентичность проекта.
- При создании нового модуля в .firmproj **создай также соответствующие пустые `.c/.h` файлы** (или хотя бы существующие пути) — UCP кнопка «Открыть файл» через `QDesktopServices` уйдёт по абсолютному пути.

## See also

- `/dryer-build` — собирает прошивку сушилки
- `/ucp-build`, `/ucp-test` — собирают и тестируют UCP (там живут модули)
- [stm32-firmware-architecture.md](../../platform_app/wiki/concepts/stm32-firmware-architecture.md) — шаблон, по которому размечены модули
