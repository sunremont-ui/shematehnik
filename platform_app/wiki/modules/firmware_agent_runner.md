# Firmware Agent Runner Module

Парный режим работы с Claude Code: ловит запросы из [Firmware Project](firmware_project.md), для каждой задачи создаёт изолированный `git worktree` + ветку `agent/<proj>-<mod>-<ts>`, запускает `claude` CLI в этом worktree и показывает прогресс/diff/buttons в UI.

## Location

- Исходники: `platform_app/modules/firmware_agent_runner/firmware_agent_runner_module.{h,cpp}`
- Зарегистрированный тип: `"FirmwareAgentRunnerModule"`
- Top-level module (no parent)
- **WASM-guard:** исключён в `CMakeLists.txt`, `modules_init.h`, `tests/test_smoke.cpp` (требует `QProcess`)

## Жизненный цикл задачи

```
EventBus("firmware_project.agent.request")
        │
        ▼
  ┌──────────────────────────────────┐
  │ 1. findGitRoot(projectRoot)      │  ← walk up ≤8 levels for .git
  │ 2. git worktree add -b <branch>  │
  │        .worktrees/agent-…  HEAD  │  ← from gitRoot
  │ 3. spawn claude (cwd = worktree) │
  │        --print                   │
  │        --output-format stream-json│
  │        --verbose <prompt>        │
  │ 4. stream stdout → task.log      │
  │ 5. on finished → status DONE/    │
  │        FAILED + repaint          │
  └──────────────────────────────────┘
```

Имя бинаря Claude хранится в `QSettings` под ключом `firmware_agent_runner/claude_bin`. Default — `claude.cmd` на Windows, `claude` на остальных. Меняется в верхней строке UI.

## UI

```
┌────────────────────────────────────────────────────────────────┐
│ claude binary: [claude.cmd        ] [Save]   <status banner>   │
├──────────────┬─────────────────────────────────────────────────┤
│ Task list    │ <Project / Module>      <STATUS color>          │
│ ─────────    │ worktree: …  branch: …  elapsed: 42s            │
│ [RUNNING]    │ ┌──────────────────────────────────────────────┐│
│ Dryer/heater │ │ Prompt (read-only)                           ││
│ [DONE]       │ ├──────────────────────────────────────────────┤│
│ Solder/regul │ │ Agent log (live, max 2000 lines)             ││
│              │ ├──────────────────────────────────────────────┤│
│              │ │ Worktree diff (after «Show diff»)            ││
│              │ └──────────────────────────────────────────────┘│
│              │ [Show diff] [Stop] [Open worktree] [Cleanup]    │
└──────────────┴─────────────────────────────────────────────────┘
```

### Кнопки (контекстные)

| Кнопка | Когда активна | Что делает |
|--------|---------------|-----------|
| **Show diff** | есть worktree | `git diff HEAD` в worktree → панель diff |
| **Stop** | статус `RUNNING` | `proc.terminate()` → `kill()`, статус `STOPPED` |
| **Open worktree** | есть worktree | `QDesktopServices` → проводник |
| **Cleanup** | задача не `RUNNING` | confirm → `git worktree remove --force` + `git branch -D <branch>` + удалить задачу |

## Test hooks (static)

| Метод | Назначение |
|-------|-----------|
| `findGitRoot(fromDir)` | Поднимается до 8 уровней в поиске `.git`, возвращает абсолютный путь или пустую строку |
| `buildClaudeArgs(prompt)` | `{"--print","--output-format","stream-json","--verbose",prompt}` |
| `taskCount()` | Текущее число задач (для smoke) |

## События

### Слушает
- `firmware_project.agent.request` (от [Firmware Project](firmware_project.md))

### План эмитить (TODO)
- `firmware_project.agent.completed` — payload `{task_id, project, module, status, branch}` — чтобы [Firmware Project](firmware_project.md) автоматически выставлял `REVIEW`/`DONE` после завершения

## Безопасность и ограничения

- Никаких `--no-verify`, `--dangerously-skip-permissions` — runner поднимает claude в стандартном режиме разрешений (либо разрешения берутся из системных `settings.json` пользователя).
- **Auto-merge не делается** — каждое изменение остаётся в отдельной ветке/worktree до ручного ревью (`git diff HEAD` + руками `git merge agent/…` в основную ветку или `Cleanup`).
- **Stream-json пока не парсится** — лог льётся как сырой текст. Для парсинга красивых событий (`tool_use`, `text`, `result`) можно расширить `onProcessReadyRead`.

## Тесты

`tests/test_smoke.cpp` — модуль в `ALL_MODULE_TYPES`, проходит factory + init + widget. Тестов на `findGitRoot`/`buildClaudeArgs` пока нет (хорошее место для будущих unit-тестов в `tests/test_integration.cpp`).

## See also

- [Firmware Project](firmware_project.md) — отправитель событий
- [OTA Flash](ota_flash.md) — соседний пример QProcess-based модуля с WASM-guard
- [Event Bus](../architecture/event_bus.md) — почему через шину, а не прямой вызов
