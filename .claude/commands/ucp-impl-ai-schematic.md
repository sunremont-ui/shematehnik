# UCP Implement: AI Schematic

Generate a schematic from a natural-language component list using the Claude API.

## Target files

- `platform_app/modules/ai/ai_schematic_module.h` (new)
- `platform_app/modules/ai/ai_schematic_module.cpp` (new)
- `platform_app/CMakeLists.txt` — add module sources + Qt6::Network
- `platform_app/tests/test_smoke.cpp` — add `AiSchematicModule` to ALL_MODULE_TYPES
- `platform_app/tests/test_integration.cpp` — add integration tests

## Architecture

```
AiSchematicModule
  ├── widget(): QSplitter
  │     ├── left: QTextEdit (prompt), QPushButton "Generate", QLabel (status)
  │     └── right: log QTextEdit (streaming response)
  └── init(): subscribe to nothing; API key from env UCP_CLAUDE_KEY
```

## Step 1: CMakeLists.txt

Add after existing find_package lines:
```cmake
find_package(Qt6 COMPONENTS Network QUIET)
if(TARGET Qt6::Network)
    target_link_libraries(ucp_modules PUBLIC Qt6::Network)
    target_compile_definitions(ucp_modules PRIVATE HAS_QT_NETWORK)
endif()
```

Add to ucp_modules sources:
```cmake
modules/ai/ai_schematic_module.cpp
```

## Step 2: Header `ai_schematic_module.h`

```cpp
#ifndef AI_SCHEMATIC_MODULE_H
#define AI_SCHEMATIC_MODULE_H

#include "../../core/module.h"
#include <QTextEdit>
#include <QPushButton>
#include <QLabel>
#ifdef HAS_QT_NETWORK
#include <QNetworkAccessManager>
#include <QNetworkReply>
#endif

class AiSchematicModule : public Module {
    Q_OBJECT
public:
    explicit AiSchematicModule(Module *parent = nullptr);
    bool     init() override;
    QWidget *widget() override;
    QString  widgetTitle() const override { return "AI Schematic"; }

private slots:
    void onGenerate();
#ifdef HAS_QT_NETWORK
    void onReplyFinished(QNetworkReply *reply);
#endif

private:
    void applySchematic(const QString &json);

    QTextEdit   *m_prompt  = nullptr;
    QTextEdit   *m_log     = nullptr;
    QPushButton *m_btnGen  = nullptr;
    QLabel      *m_status  = nullptr;
#ifdef HAS_QT_NETWORK
    QNetworkAccessManager *m_nam = nullptr;
#endif
};

#endif
```

## Step 3: Implementation `ai_schematic_module.cpp`

### Claude API call
```cpp
// POST https://api.anthropic.com/v1/messages
// Headers: x-api-key: <key>, anthropic-version: 2023-06-01, content-type: application/json
// Body:
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": "<prompt>\nRespond ONLY with JSON: {\"components\":[{\"refdes\":\"R1\",\"value\":\"10k\",\"type\":\"R\"},...],\"connections\":[[\"R1.1\",\"C1.+\"],[\"R1.2\",\"GND\"]]}"
  }]
}
```

### Parse response → place on schematic
```cpp
void AiSchematicModule::applySchematic(const QString &json) {
    QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
    auto comps = doc["components"].toArray();
    auto conns = doc["connections"].toArray();
    // Emit EventBus "ai.schematic.ready" with parsed data
    // SchematicModule subscribes and places components + wires
    EventBus::instance().emitEvent("ai.schematic.ready", QVariantMap{
        {"components", QVariant::fromValue(comps)},
        {"connections", QVariant::fromValue(conns)}
    });
}
```

### API key
```cpp
QString key = qEnvironmentVariable("UCP_CLAUDE_KEY");
if (key.isEmpty()) {
    m_log->append("Set UCP_CLAUDE_KEY env variable.");
    return;
}
```

## Step 4: SchematicModule subscribes to `ai.schematic.ready`

In `SchematicModule::init()`:
```cpp
EventBus::instance().on("ai.schematic.ready", this, &SchematicModule::onAiSchematic);
```

`onAiSchematic` places components in a grid and draws wires for each connection pair.

## Step 5: Integration test (mock — no real API call)

```cpp
void TestIntegration::ai_schematic_mock_apply() {
    // Build a minimal JSON response and call applySchematic directly
    // Verify EventBus "ai.schematic.ready" is emitted with correct data
}
```

## Acceptance criteria
- widget() non-null (smoke test passes)
- With valid UCP_CLAUDE_KEY: pressing Generate sends HTTP POST, places components
- Without key: error shown in log, no crash
- EventBus event emitted with parsed component list
- Fallback label if HAS_QT_NETWORK not defined

## After implementing
Mark `[ ] AI Schematic` done in `wiki/roadmap.md` v2.0 section.
