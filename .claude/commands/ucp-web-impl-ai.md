# UCP Web Implement: AI Schematic via Claude API (optional)

Phase 15.3 (`wiki/roadmap-web.md`), **опциональная** — фаза 9 снимала серверную
интеграцию; это лёгкий вариант: ключ пользователя в браузере, прямой запрос к
Claude API из SPA, ответ размещается в `UcpProject`.

**Перед реализацией прочитай скилл `claude-api`** (правила SDK, модели, structured outputs).

## Target files

- `platform_app/web/src/modules/AiView.tsx` — replace setTimeout-мок
- `platform_app/web/src/ai.ts` — NEW: запрос + размещение
- `platform_app/web/package.json` — `@anthropic-ai/sdk` (lazy import!)

## Design

- **Ключ**: поле ввода (type=password), хранить в `localStorage` (`ucp.claudeKey`)
  с явным предупреждением «ключ хранится локально в браузере». Без ключа — текущий
  мок с подписью «демо (нет ключа)».
- **SDK в браузере**: `const { default: Anthropic } = await import("@anthropic-ai/sdk")`;
  `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })` — опция включает
  CORS-доступ из браузера. Lazy import, чтобы не раздувать бандл.
- **Модель**: `claude-opus-4-8`. Без `temperature` (на новых моделях параметр удалён).
- **Structured output** вместо «верни JSON» в промпте:
  `client.messages.parse(...)` / `output_config: { format: { type: "json_schema", schema } }`
  со схемой `{components: [{ref, kind, value, x, y}], wires: [{from:{ref,pin}, to:{ref,pin}}]}` —
  kind из enum существующих видов (R/C/L/D/Q/U), `additionalProperties: false`.
  Префилл ассистента НЕ использовать (400 на новых моделях).
- **Промпт**: system — список доступных деталей из `LIBRARY` (id/kind/value/pins) и
  правила сетки; user — описание пользователя.
- **Размещение**: ответ → `UcpProject` через существующие действия store
  (refs через `nextRef`, провода через wire-модель) → переключить на Schematic,
  статус `ai.schematic.ready → placed N components`.
- **Ошибки**: typed exceptions SDK (`AuthenticationError` → «проверьте ключ»,
  `RateLimitError` → retry-after); `stop_reason === "refusal"` → показать сообщение.

## Tests

- Vitest: чистая функция `placeAiResult(project, result)` — refs уникальны, провода валидны, неизвестный kind → U.
- e2e: без ключа рендерится мок-путь, ошибок консоли нет. Реальный запрос — ручная проверка пользователем.

## After implementing

Tick 15.3, log entry, `/ucp-web`. В wiki/web_frontend.md убрать AI из списка «демо».
