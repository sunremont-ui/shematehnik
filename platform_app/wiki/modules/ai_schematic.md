# AI Schematic Module

Generates schematic components and connections via the Claude API, then auto-places them on the `SchematicScene`.

## Location

`platform_app/modules/ai/ai_schematic_module.h/.cpp`  
Registered type: `"AiSchematicModule"`  
Parent module: `SchematicModule` (child)

## Functionality

1. User enters a natural-language prompt (e.g. "555 timer astable with LED")
2. Module POSTs to `https://api.anthropic.com/v1/messages` (model `claude-sonnet-4-6`)
3. Response JSON → `applySchematic()` → EventBus `ai.schematic.ready`
4. `SchematicModule::onAiSchematic()` clears the scene and places components + wires

## API Contract

**Request:** `POST https://api.anthropic.com/v1/messages`

Headers:
- `x-api-key: <UCP_CLAUDE_KEY env var>`
- `anthropic-version: 2023-06-01`
- `content-type: application/json`

System prompt instructs Claude to respond with:
```json
{
  "components": [
    {"refdes": "R1", "value": "10k", "type": "R"}
  ],
  "connections": [
    {"from": {"refdes": "R1", "pin": "1"}, "to": {"refdes": "C1", "pin": "+"}}
  ]
}
```

**Response parsing:** extracts `content[0].text`, strips ` ```json ` fences, then `QJsonDocument::fromJson()`.

## EventBus

- **Emits:** `ai.schematic.ready` — `QVariantMap{{"components", QVariantList}, {"connections", QVariantList}}`
- **Consumed by:** `SchematicModule::onAiSchematic()`

## Placement Logic

Components placed in an 8-column grid with 120px horizontal / 100px vertical spacing.  
Wires added via `SchematicScene::addWire(pinA, pinB)` using refdes+pin lookup.

## Build Guard

`#ifdef HAS_QT_NETWORK` — requires `Qt6::Network`. Enabled automatically when found by CMake.  
If network is unavailable, the module still registers and its widget shows a status label.

## API Key

Set environment variable `UCP_CLAUDE_KEY` before launching:
```powershell
$env:UCP_CLAUDE_KEY = "sk-ant-..."
D:\shemaTehnik\platform_app\build\ucp.exe
```

## Tests

`tests/test_integration.cpp`:
- `ai_valid_json` — `applySchematic()` with valid JSON places components
- `ai_markdown_strip` — strips ` ```json ` fences correctly
- `ai_empty_components` — empty components array → no crash
- `ai_event_emitted` — `AiEventReceiver` helper captures `ai.schematic.ready`
